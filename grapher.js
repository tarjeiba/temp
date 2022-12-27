const SVGNS = "http://www.w3.org/2000/svg";
export function createAnalyzerTimePlot(position) {
    const svgns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgns, "svg");
    svg.setAttribute("viewBox", "0 -50 2048 100");
    svg.setAttribute("preserveAspectRatio", "none");
    const line = document.createElementNS(svgns, "polyline");
    line.setAttribute("fill", "none");
    line.setAttribute("stroke", "black");
    function updateLine(data) {
        const arr = new Array(...data);
        line.setAttribute("points", arr.map((num, idx) => `${idx}, ${num * 500}`).join(" "));
    }
    svg.appendChild(line);
    position.after(svg);
    return updateLine;
}
const waveforms = {
    sine: (f, x) => Math.sin(f * x),
    triangle: (f, x) => {
        const T = 1 / f;
        const t = 123 % 2;
    },
};
class Controller {
    constructor(graph, el) {
        this.graph = graph;
        this.el = el;
        this.el.oninput = () => this.graph.updateFrequency(Number(this.el.value));
    }
}
class Graph {
    constructor(id, caption) {
        var _a;
        this.markers = [];
        this.createControllers = (el) => {
            const inputs = Array.from(el.getElementsByTagName("input"));
            inputs.forEach((input) => new Controller(this, input));
        };
        const el = document.getElementById(id);
        const figure = document.createElement("figure");
        const controlPanels = Array.from((_a = el === null || el === void 0 ? void 0 : el.getElementsByClassName("controlpanel")) !== null && _a !== void 0 ? _a : []);
        controlPanels.forEach(this.createControllers);
        this.svg = document.createElementNS(SVGNS, "svg");
        this.svg.setAttribute("width", "80%");
        this.svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        this.svg.setAttribute("viewBox", "0 -50 100 100");
        if (caption) {
            const figcaption = document.createElement("figcaption");
            figcaption.textContent = caption;
            figure.append(figcaption);
        }
        this.initializeAxes();
        this.drawSine(50, 0.1, 0, 100, 0, 100);
        figure.appendChild(this.svg);
        el === null || el === void 0 ? void 0 : el.appendChild(figure);
    }
    initializeAxes() {
        const g = document.createElementNS(SVGNS, "g");
        g.setAttribute("class", "axes");
        const xaxis = document.createElementNS(SVGNS, "line");
        xaxis.setAttribute("x1", "0");
        xaxis.setAttribute("x2", "100");
        const yaxis = document.createElementNS(SVGNS, "line");
        yaxis.setAttribute("y1", "-50");
        yaxis.setAttribute("x1", "50");
        yaxis.setAttribute("y2", "50");
        yaxis.setAttribute("x2", "50");
        g.appendChild(xaxis);
        g.appendChild(yaxis);
        this.svg.appendChild(g);
    }
    updateFrequency(value) {
        this.markers.forEach((marker) => {
            var _a;
            marker.setAttribute("cy", String((_a = waveforms["sine"](value, Number(marker.getAttribute("cx")))) !== null && _a !== void 0 ? _a : 0 * 50));
        });
    }
    drawMarker(x, y, group) {
        const circle = document.createElementNS(SVGNS, "circle");
        circle.setAttribute("r", "1");
        circle.setAttribute("cx", String(x));
        circle.setAttribute("cy", String(y));
        circle.setAttribute("fill", "red");
        group.appendChild(circle);
        this.markers.push(circle);
    }
    drawSine(amplitude, frequency, phi, N, x0, length) {
        const g = document.createElementNS(SVGNS, "g");
        for (let i = 0; i < N; i++) {
            const x = x0 + (i * length) / N;
            const y = amplitude * Math.sin(frequency * x + phi);
            this.drawMarker(x, y, g);
        }
        this.svg.appendChild(g);
    }
}
(() => {
    const ikkeinteraktiv = new Graph("ikkeinteraktivsinus");
    const enkelsinus = new Graph("enkelsinus");
})();
