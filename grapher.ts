const SVGNS = "http://www.w3.org/2000/svg";

export function createAnalyzerTimePlot(
  position: HTMLElement | null,
  scale?: boolean
): (data: Float32Array) => void {
  if (!position) return console.log;
  const svgns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgns, "svg");
  if (scale) {
    svg.setAttribute("viewBox", "0 -500 2048 1000");
  } else {
    svg.setAttribute("viewBox", "0 -50 2048 100");
  }
  svg.setAttribute("preserveAspectRatio", "none");

  const line = document.createElementNS(svgns, "polyline");
  line.setAttribute("fill", "none");
  line.setAttribute("stroke", "black");

  function updateLine(data: Float32Array): void {
    let neg = false;
    let breakpoint = 0;

    for (let i = 0; i < data.length; i++) {
      const pos = data[i] >= 0;
      if (!neg && !pos) {
        neg = true;
      }

      if (neg && pos) {
        breakpoint = i;
        break;
      }
    }
    const arr = new Array(...data.slice(breakpoint));
    line.setAttribute(
      "points",
      arr.map((num, idx) => `${idx}, ${num * 500}`).join(" ")
    );
  }

  svg.appendChild(line);
  position.after(svg);

  return updateLine;
}

const waveforms = {
  sine: (f: number, x: number) => Math.sin(f * x),
  triangle: (f: number, x: number) => {
    const T = 1 / f;
    const t = 123 % 2;
  },
};

class Controller {
  constructor(private graph: Graph, private el: HTMLInputElement) {
    this.el.oninput = () => this.graph.updateFrequency(Number(this.el.value));
  }
}

class Graph {
  private svg: SVGElement;
  private markers: SVGCircleElement[] = [];

  constructor(id: string, caption?: string) {
    const el = document.getElementById(id) as HTMLDivElement;
    const figure = document.createElement("figure");

    const controlPanels = Array.from(
      el?.getElementsByClassName("controlpanel") ?? []
    ) as HTMLDivElement[];
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
    el?.appendChild(figure);
  }

  createControllers = (el: HTMLDivElement): void => {
    const inputs = Array.from(el.getElementsByTagName("input"));
    inputs.forEach((input) => new Controller(this, input));
  };

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

  updateFrequency(value: number): void {
    this.markers.forEach((marker) => {
      marker.setAttribute(
        "cy",
        String(
          waveforms["sine"](value, Number(marker.getAttribute("cx"))) ?? 0 * 50
        )
      );
    });
  }

  drawMarker(x: number, y: number, group: SVGGElement) {
    const circle = document.createElementNS(SVGNS, "circle");
    circle.setAttribute("r", "1");
    circle.setAttribute("cx", String(x));
    circle.setAttribute("cy", String(y));
    circle.setAttribute("fill", "red");
    group.appendChild(circle);
    this.markers.push(circle);
  }

  drawSine(
    amplitude: number,
    frequency: number,
    phi: number,
    N: number,
    x0: number,
    length: number
  ) {
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
