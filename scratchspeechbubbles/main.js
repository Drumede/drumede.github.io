const BubbleStyle = {
    MAX_LINE_WIDTH: 170, // Maximum width, in Scratch pixels, of a single line of text

    MIN_WIDTH: 50, // Minimum width, in Scratch pixels, of a text bubble
    STROKE_WIDTH: 4, // Thickness of the stroke around the bubble. Only half's visible because it's drawn under the fill
    PADDING: 10, // Padding around the text area
    CORNER_RADIUS: 16, // Radius of the rounded corners
    TAIL_HEIGHT: 12, // Height of the speech bubble's "tail". Probably should be a constant.

    FONT: 'sans-serif', // Font to render the text with
    FONT_SIZE: 14, // Font size, in Scratch pixels
    FONT_HEIGHT_RATIO: 0.9, // Height, in Scratch pixels, of the text, as a proportion of the font's size
    LINE_HEIGHT: 16, // Spacing between each line of text

    COLORS: {
        BUBBLE_FILL: 'white',
        BUBBLE_STROKE: 'rgba(0, 0, 0, 0.15)',
        TEXT_FILL: '#575E75'
    }
};

// standalone-text-wrapper.js
// Replacement for original text-wrapper.js with no external dependencies.
// Uses local LineBreaker and GraphemeBreaker implementations.

/**
 * Minimal LineBreaker replacement.
 * Produces break objects with:
 *  - position: index into the original text where break occurs (end of segment)
 *  - required: boolean meaning "hard" break (contains newline)
 *
 * This implementation finds runs of Unicode whitespace and reports a break
 * at the end of each run. The final break at text.length is returned last.
 */

class CanvasMeasurementProvider {
    constructor(ctx) {
        if (!ctx || typeof ctx.measureText !== "function") {
            throw new Error("A valid 2D canvas context must be provided");
        }

        this.ctx = ctx;
    }

    beginMeasurementSession() {
        // No setup needed, but kept for API compatibility
        return null;
    }

    measureText(str) {
        return this.ctx.measureText(str).width;
    }

    endMeasurementSession(session) {
        // No teardown needed
    }
}


class LineBreaker {
    constructor(text) {
        this.text = text || '';
        this._lastIndex = 0;
        this._matches = [];

        // Find whitespace runs. Use Unicode whitespace via \s (JS's \s covers usual whitespace).
        const re = /\s+/gu;
        let m;
        while ((m = re.exec(this.text)) !== null) {
            const start = m.index;
            const len = m[0].length;
            const end = start + len;
            // required = true if any newline inside the whitespace run
            const required = /[\r\n]/.test(m[0]);
            this._matches.push({ position: end, required });
        }

        // Always include final end-of-text break
        this._matches.push({ position: this.text.length, required: false });
        this._pos = 0;
    }

    nextBreak() {
        if (this._pos >= this._matches.length) return null;
        const b = this._matches[this._pos++];
        return b;
    }
}

/**
 * GraphemeBreaker replacement.
 * Exposes static nextBreak(word, lastIndex) => index of next break (character boundary),
 * matching the usage pattern in the original file.
 *
 * Implementation:
 *  - If Intl.Segmenter with granularity 'grapheme' is available, precompute segment boundaries.
 *  - Otherwise approximate by using Array.from(word) (code point iteration). This is not fully
 *    equivalent to Unicode grapheme segmentation for all edge cases, but works well for most text.
 */
class GraphemeBreaker {
    // helper to get cluster boundaries array for a given string
    static _getBoundaries(word) {
        if (!word) return [0, 0];

        // Use Intl.Segmenter when available
        if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
            try {
                const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
                const it = seg.segment(word)[Symbol.iterator]();
                let idx = 0;
                const boundaries = [0];
                for (const segItem of it) {
                    idx += segItem.segment.length;
                    boundaries.push(idx);
                }
                // ensure last boundary equals word.length
                if (boundaries[boundaries.length - 1] !== word.length) {
                    boundaries.push(word.length);
                }
                return boundaries;
            } catch (e) {
                // fall through to fallback
            }
        }

        // Fallback: use Array.from to split into codepoints (approximation)
        const arr = Array.from(word);
        const boundaries = [0];
        let pos = 0;
        for (let i = 0; i < arr.length; ++i) {
            pos += arr[i].length;
            boundaries.push(pos);
        }
        if (boundaries[boundaries.length - 1] !== word.length) boundaries.push(word.length);
        return boundaries;
    }

    /**
     * nextBreak(word, lastIndex)
     * - word: string
     * - lastIndex: previous break index into word (0-based)
     * returns the next break index (integer). If lastIndex already at end, returns lastIndex.
     */
    static nextBreak(word, lastIndex) {
        if (!word) return 0;
        // Use a simple cache keyed by word reference to avoid recomputing boundaries in tight loops.
        // We avoid a global map to keep this class standalone and memory-friendly; store on the word object
        // would be unsafe, so we use a WeakMap keyed by canonical string object wrapper.
        if (!this._cache) this._cache = new Map();

        let boundaries = this._cache.get(word);
        if (!boundaries) {
            boundaries = GraphemeBreaker._getBoundaries(word);
            // store only a limited size cache to avoid unbounded memory growth
            try {
                this._cache.set(word, boundaries);
                if (this._cache.size > 5000) {
                    // simple eviction: clear cache when too large
                    this._cache.clear();
                }
            } catch (e) {
                // in some environments Map.set may throw for certain keys; ignore caching then
            }
        }

        // If lastIndex already === end, return it
        if (lastIndex >= boundaries[boundaries.length - 1]) return lastIndex;

        // Find the next boundary strictly greater than lastIndex
        // boundaries is an ascending integer array
        for (let i = 0; i < boundaries.length; ++i) {
            if (boundaries[i] > lastIndex) return boundaries[i];
        }
        // fallback to end
        return boundaries[boundaries.length - 1];
    }
}

/**
 * TextWrapper (same logic as original) but using local LineBreaker and GraphemeBreaker.
 *
 * MeasurementProvider API expected:
 *  - beginMeasurementSession(): optional, returns session info
 *  - measureText(str): returns numeric width
 *  - endMeasurementSession(sessionInfo): optional cleanup
 */
class TextWrapper {
    constructor(measurementProvider) {
        if (!measurementProvider || typeof measurementProvider.measureText !== 'function') {
            throw new Error('measurementProvider with measureText() is required');
        }
        this._measurementProvider = measurementProvider;
        this._cache = {};
    }

    wrapText(maxWidth, text) {
        if (typeof text !== 'string') text = String(text == null ? '' : text);

        // Normalize text to canonical composition
        if (typeof text.normalize === 'function') {
            text = text.normalize();
        }

        const cacheKey = `${maxWidth}-${text}`;
        if (this._cache[cacheKey]) {
            return this._cache[cacheKey].slice(); // return a copy
        }

        const measurementSession = this._measurementProvider.beginMeasurementSession && this._measurementProvider.beginMeasurementSession();

        const breaker = new LineBreaker(text);
        let lastPosition = 0;
        let nextBreak;
        let currentLine = null;
        const lines = [];

        while ((nextBreak = breaker.nextBreak())) {
            // slice the candidate "word" from lastPosition to the break position (strip trailing newlines)
            const raw = text.slice(lastPosition, nextBreak.position);
            // The original implementation did .replace(/\n+$/, '') to drop trailing newlines;
            // keep same semantics.
            const word = raw.replace(/\n+$/, '');

            let proposedLine = (currentLine || '').concat(word);
            let proposedLineWidth = this._measurementProvider.measureText(proposedLine);

            if (proposedLineWidth > maxWidth) {
                // The next word won't fit on this line. Will it fit on a line by itself?
                const wordWidth = this._measurementProvider.measureText(word);
                if (wordWidth > maxWidth) {
                    // The next word can't even fit on a line by itself. Consume it one grapheme cluster at a time.
                    let lastCluster = 0;
                    let nextCluster;
                    while (lastCluster !== (nextCluster = GraphemeBreaker.nextBreak(word, lastCluster))) {
                        const cluster = word.substring(lastCluster, nextCluster);
                        proposedLine = (currentLine || '').concat(cluster);
                        proposedLineWidth = this._measurementProvider.measureText(proposedLine);
                        if ((currentLine === null) || (proposedLineWidth <= maxWidth)) {
                            // first cluster of a new line or the cluster fits
                            currentLine = proposedLine;
                        } else {
                            // no more can fit
                            lines.push(currentLine);
                            currentLine = cluster;
                        }
                        lastCluster = nextCluster;
                    }
                } else {
                    // The next word can fit on the next line. Finish the current line and move on.
                    if (currentLine !== null) lines.push(currentLine);
                    currentLine = word;
                }
            } else {
                // The next word fits on this line. Just keep going.
                currentLine = proposedLine;
            }

            // Did we find a \n or similar? If so we must break the line.
            if (nextBreak.required) {
                if (currentLine !== null) lines.push(currentLine);
                currentLine = null;
            }

            lastPosition = nextBreak.position;
        }

        currentLine = currentLine || '';
        if (currentLine.length > 0 || lines.length === 0) {
            lines.push(currentLine);
        }

        // cache and return a copy
        this._cache[cacheKey] = lines.slice();
        if (this._measurementProvider.endMeasurementSession) {
            this._measurementProvider.endMeasurementSession(measurementSession);
        }
        return lines.slice();
    }
}

// Export for Node.js/CommonJS and also attach to window if in browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TextWrapper;
} else {
    // browser global
    if (typeof window !== 'undefined') {
        window.TextWrapper = TextWrapper;
    }
}
    id = 0
    _size = [0, 0];
    _renderedScale = 0;
    _lines = [];
    _textAreaSize = {width: 0, height: 0};
    _bubbleType = 'say';
    _pointsLeft = false;
    _textDirty = true;
    _textureDirty = true;

    _ctx =  null
measurementProvider = null
textWrapper = null

reset = () => {
    id += 1
    _size = [0, 0];
    _renderedScale = 0;
    _lines = [];
    _textAreaSize = {width: 0, height: 0};
    _bubbleType = 'say';
    _pointsLeft = false;
    _textDirty = true;
    _textureDirty = true;

    _ctx =  new C2S();
    measurementProvider = new CanvasMeasurementProvider(_ctx);
    textWrapper = new TextWrapper(measurementProvider);
}



setTextBubble = (type, text, pointsLeft) => {
    _text = text;
    _bubbleType = type;
    _pointsLeft = pointsLeft;
    _textDirty = true;
    _textureDirty = true;
}

_restyleCanvas = () => {
    _ctx.font = `${BubbleStyle.FONT_SIZE}px ${BubbleStyle.FONT}, sans-serif`;
}

_reflowLines = () => {
    _lines = textWrapper.wrapText(BubbleStyle.MAX_LINE_WIDTH, _text);

    // Measure width of longest line to avoid extra-wide bubbles
    let longestLineWidth = 0;
    for (const line of _lines) {
        longestLineWidth = Math.max(longestLineWidth, measurementProvider.measureText(line));
    }

    // Calculate the canvas-space sizes of the padded text area and full text bubble
    const paddedWidth = Math.max(longestLineWidth, BubbleStyle.MIN_WIDTH) + (BubbleStyle.PADDING * 2);
    const paddedHeight = (BubbleStyle.LINE_HEIGHT * _lines.length) + (BubbleStyle.PADDING * 2);

    _textAreaSize.width = paddedWidth;
    _textAreaSize.height = paddedHeight;

    _size[0] = paddedWidth + BubbleStyle.STROKE_WIDTH;
    _size[1] = paddedHeight + BubbleStyle.STROKE_WIDTH + BubbleStyle.TAIL_HEIGHT;

    _textDirty = false;
}

_renderTextBubble3 = (scale) => {
        const ctx = _ctx;
        
        if (_textDirty) {
            _reflowLines();
        }

        // Calculate the canvas-space sizes of the padded text area and full text bubble
        const paddedWidth = _textAreaSize.width;
        const paddedHeight = _textAreaSize.height;

        // Resize the canvas to the correct screen-space size
        ctx.width = Math.ceil(_size[0] * scale);
        ctx.height = Math.ceil(_size[1] * scale);

        _restyleCanvas();

        // Reset the transform before clearing to ensure 100% clearage
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        ctx.scale(scale, scale);
        ctx.translate(BubbleStyle.STROKE_WIDTH * 0.5, BubbleStyle.STROKE_WIDTH * 0.5);

        // If the text bubble points leftward, flip the canvas
        ctx.save();
        if (_pointsLeft) {
            ctx.scale(-1, 1);
            ctx.translate(-paddedWidth, 0);
        }

        // Draw the bubble's rounded borders
        ctx.beginPath();
        ctx.moveTo(BubbleStyle.CORNER_RADIUS, paddedHeight);
        ctx.arcTo(0, paddedHeight, 0, paddedHeight - BubbleStyle.CORNER_RADIUS, BubbleStyle.CORNER_RADIUS);
        ctx.arcTo(0, 0, paddedWidth, 0, BubbleStyle.CORNER_RADIUS);
        ctx.arcTo(paddedWidth, 0, paddedWidth, paddedHeight, BubbleStyle.CORNER_RADIUS);
        ctx.arcTo(paddedWidth, paddedHeight, paddedWidth - BubbleStyle.CORNER_RADIUS, paddedHeight,
            BubbleStyle.CORNER_RADIUS);

        // Translate the canvas so we don't have to do a bunch of width/height arithmetic
        offsetx = paddedWidth - BubbleStyle.CORNER_RADIUS
        offsety = paddedHeight
        // Draw the bubble's "tail"
        if (_bubbleType === 'say') {
            // For a speech bubble, draw one swoopy thing
            ctx.bezierCurveTo(offsetx+0, offsety+4, offsetx+4, offsety+8, offsetx+4, offsety+10);
            ctx.arcTo(offsetx+4, offsety+12, offsetx+2, offsety+12, 2);
            ctx.bezierCurveTo(offsetx+-1, offsety+12, offsetx+-11, offsety+8, offsetx+-16, offsety+0);

            ctx.closePath();
        } else {
            // For a thinking bubble, draw a partial circle attached to the bubble...
            ctx.arc(offsetx+-16, offsety+0, 4, 0, Math.PI);

            ctx.closePath();

            // and two circles detached from it
            ctx.moveTo(offsetx+-7, offsety+7.25);
            ctx.arc(offsetx+-9.25, offsety+7.25, 2.25, 0, Math.PI * 2);
            ctx.moveTo(offsetx+0, offsety+9.5);
            ctx.arc(offsetx+-1.5, offsety+9.5, 1.5, 0, Math.PI * 2);
        }

        ctx.fillStyle = BubbleStyle.COLORS.BUBBLE_FILL;
        ctx.strokeStyle = BubbleStyle.COLORS.BUBBLE_STROKE;
        ctx.lineWidth = BubbleStyle.STROKE_WIDTH;

        
        ctx.stroke();
        ctx.fill();

        // Un-flip the canvas if it was flipped
        ctx.restore();

        // Draw each line of text
        ctx.fillStyle = BubbleStyle.COLORS.TEXT_FILL;
        ctx.font = `${BubbleStyle.FONT_SIZE}px ${BubbleStyle.FONT}, sans-serif`;
        const lines = _lines;
        for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
            const line = lines[lineNumber];
            ctx.fillText(
                line,
                BubbleStyle.PADDING,
                BubbleStyle.PADDING + (BubbleStyle.LINE_HEIGHT * lineNumber) +
                    (BubbleStyle.FONT_HEIGHT_RATIO * BubbleStyle.FONT_SIZE)
            );
        }

        _renderedScale = scale;
    }

_renderTextBubble2 = (scale) => {
    const radius = 6;
    const padding = 5;
    const minWidth = 55;
    const pInset1 = 16;
    const pInset2 = 50;
    const pDrop = 17;
    const pDropX = 8;
    const lineWidth = 6;
    const lineHeight = 16;


    const ctx = _ctx;
    ctx.font = 'bold 14px Arial, Arial';

    // find line length
    const desiredWidth = 135;
    _lines = textWrapper.wrapText(desiredWidth, _text);

    // Measure width of longest line to avoid extra-wide bubbles
    let longestLineWidth = 0;
    for (const line of _lines) {
        longestLineWidth = Math.max(longestLineWidth, measurementProvider.measureText(line));
    }

    longestLineWidth = Math.max(minWidth, Math.min(longestLineWidth + 8, desiredWidth))

    let w = longestLineWidth + padding * 2 - 5;
    let h = _lines.length * lineHeight + padding * 2;

    ctx.width = Math.ceil(w * scale) + lineWidth;
    ctx.height = Math.ceil(h * scale) + pDrop + lineWidth * 2;

    ctx.scale(scale, scale);
    ctx.translate(lineWidth * 0.5, lineWidth * 0.5);

    
    let insetW = w - radius;
    let insetH = h - radius;

    ctx.beginPath();

    ctx.moveTo(radius, 0);
    ctx.lineTo(insetW, 0);
    arc(ctx, w, radius);
    ctx.lineTo(w, insetH);
    arc(ctx, insetW, h);
    if (_bubbleType === 'say') {
        if (_pointsLeft) {
            ctx.lineTo(pInset2, h);
            ctx.lineTo(pDropX, h + pDrop);
            ctx.lineTo(pInset1, h);
        } else {
            ctx.lineTo(w - pInset1, h);
            ctx.lineTo(w - pDropX, h + pDrop);
            ctx.lineTo(w - pInset2, h);
        }
    }
    ctx.lineTo(radius, h);
    arc(ctx, 0, insetH);
    ctx.lineTo(0, radius);
    arc(ctx, radius, 0);

    ctx.closePath();

    ctx.fillStyle = 'white';
    ctx.strokeStyle = '#A0A0A0';
    ctx.lineWidth = lineWidth;

    ctx.stroke();
    ctx.fill();

    if (_bubbleType != 'say') {
        if (_pointsLeft) {
            ctx.beginPath();
            ellipse(ctx, 14.875, h + 4.25, 9.5, 5);
            ellipse(ctx, 11, h + 12, 6, 3);
            ctx.lineWidth = 4;
            ctx.stroke();
            ctx.fill();

            ctx.beginPath();
            ellipse(ctx, 4.75, h + 16.375, 5, 3);
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fill();

        } else {
            ctx.beginPath();
            ellipse(ctx, w - 29, h + 4.25, 9.5, 5);
            ellipse(ctx, w - 20, h + 12, 6, 3);
            ctx.lineWidth = 4;
            ctx.stroke();
            ctx.fill();

            ctx.beginPath();
            ellipse(ctx, w - 12, h + 16.375, 5, 3);
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fill();
        }
    }

    ctx.fillStyle = 'black';
    const lines = _lines;
    for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
        const line = lines[lineNumber];
        ctx.fillText(
            line,
            padding + (longestLineWidth - measurementProvider.measureText(line)) / 2 - 2.5,
            lineHeight * (1 + lineNumber) + 2
        );
    }
}

function arc (ctx, x, y) {
    const roundness = 0.42;
    let midX = (ctx.__currentPosition.x + x) / 2.0;
    let midY = (ctx.__currentPosition.y + y) / 2.0;
    let cx = midX + (roundness * (y - ctx.__currentPosition.y));
    let cy = midY - (roundness * (x - ctx.__currentPosition.x));
    ctx.quadraticCurveTo(cx, cy, x, y);
}

function ellipse(ctx, x, y, radiusX, radiusY) {
    radiusX /= 2.0;
    radiusY /= 2.0;
    x += radiusX;
    y += radiusY;
    ctx.moveTo(x, y)
    ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
}


async function saveSvg(id) {
    const svgElement = document.getElementById(id); 
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = 'speechbubble.svg'; // Specify the desired filename
    document.body.appendChild(downloadLink); // Append to body (can be hidden)
    downloadLink.click();
    document.body.removeChild(downloadLink); // Remove from body
    URL.revokeObjectURL(downloadLink.href); // Release the object URL
}
const body = document.getElementById('svg-container')

function addBubble(type, text, pointsLeft,scale) {
    reset()
    _restyleCanvas();
    setTextBubble(type, text, pointsLeft);
    if (_style == '2.0') {
        _renderTextBubble2(scale)
    } else {
        _renderTextBubble3(scale)
    }

    let svg = _ctx.getSvg()

    var svgElement = svg;
    svgElement.setAttribute('width', _ctx.width);
    svgElement.setAttribute('height', _ctx.height);
    svgElement.setAttribute('id', id);
    const container = document.createElement("div")
    container.setAttribute('class', 'svg-container');
    body.prepend(container)
    container.appendChild(svgElement);
    var button = document.createElement('button')
    button.textContent = 'Export'
    button.setAttribute('onclick','clickToSave(this)')
    container.appendChild(button)
    var delbutton = document.createElement('button')
    delbutton.setAttribute('class', 'negative');
    delbutton.textContent = 'Delete'
    delbutton.setAttribute('onclick','deleteSvg(this)')
    container.appendChild(delbutton)
}

function speechBubbleGenerate() {
    const text = document.getElementById("speechinput").value
    const thinking = document.getElementById("thinker").checked ? 'think' : 'say'
    const pointsleft = document.getElementById("isleft").checked
    _style = document.getElementById("style").checked ? '2.0' : '3.0' // i hate global variables
    addBubble(thinking,text,pointsleft,1)
}

function clickToSave(buttonElement) {
    const parent = buttonElement.parentElement
    const svg = parent.firstElementChild
    console.log(svg.id)
    saveSvg(svg.id)
}

function deleteSvg(buttonElement) {
    const parent = buttonElement.parentElement
    parent.remove()
}