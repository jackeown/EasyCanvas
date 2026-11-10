/** Types for the existing classic-script browser bundle. No runtime exports. */
export interface PlotLabels {
  title?: string;
  xLabel?: string;
  yLabel?: string;
  legendLabels?: string[];
  colors?: string[];
  autoScale?: boolean;
}
export interface LinePlotSettings extends PlotLabels {
  inputs?: string[];
  outputs?: string[];
  lineWidth?: number;
  tooltips?: string[];
  xmin?: number;
  xmax?: number;
  ymin?: number;
  ymax?: number;
  xTicks?: number;
  yTicks?: number;
  xAxisIsTime?: boolean;
  yAxisIsTime?: boolean;
}
export type LinePlotData = Record<string, number[]>;
export interface BarPlotData { bars: string[]; heights: number[]; }
export interface LabelSettings {
  x: number; y: number; text: string;
  theta?: number;
  font?: string;
  textAlign?: CanvasTextAlign;
  textBaseline?: CanvasTextBaseline;
}
export interface DefaultAxesSettings {
  xTicks?: number; yTicks?: number;
  xAxisIsTime?: boolean; yAxisIsTime?: boolean;
}
export interface AxisSettings {
  x1: number; y1: number; x2: number; y2: number;
  labelXOffset: number; labelYOffset: number; labelTheta: number;
  nTicks: number;
  labels?: string[];
  scaleStart?: number; scaleEnd?: number;
  isDatetime?: boolean;
}
export interface EasyCanvasElement extends HTMLElement {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  shadow: ShadowRoot;
  xmin: number; xmax: number; ymin: number; ymax: number;
  xpadding: number; ypadding: number;
  framerate: number; fontsize: number; dpr: number;
  debug: boolean; defaultAxesOn: boolean;
  DPIHasBeenSet: boolean;
  mouseX: number | undefined; mouseY: number | undefined;
  mouseDown: boolean;
  drawingLoop?: () => void;
  alreadyAutoScaledLinePlot?: boolean;
  hotAndReady: {
    linePlot(data: LinePlotData, settings: LinePlotSettings): void;
    barPlot(data: BarPlotData, settings: PlotLabels): void;
    /** Historical placeholder; does not render a histogram. */
    histogram(data: unknown): void;
    drawTooltip(x: number, y: number, info: Record<string, unknown>): void;
  };
  scaleX(value: number): number;
  scaleY(value: number): number;
  scaleXInverse(value: number): number;
  scaleYInverse(value: number): number;
  updateScales(): void;
  fixDPI(): void;
  renderPlot(): void;
  saveScalesAndRanges(): void;
  linkInfo(keys: string[], link: Record<string, unknown>): void;
  drawLine(data: {xs: number[]; ys: number[]}, lineWidth?: number): void;
  arc(cx: number, cy: number, radius: number, start: number, end: number, counterclockwise?: boolean): void;
  rect(x: number, y: number, width: number, height: number): void;
  mouseInCircle(cx: number, cy: number, radius: number): boolean;
  mouseInRect(x1: number, y1: number, x2: number, y2: number): boolean;
  drawLabel(settings: LabelSettings): void;
  drawAxis(settings: AxisSettings): void;
  drawDefaultAxes(settings?: DefaultAxesSettings): void;
}
declare global {
  interface HTMLElementTagNameMap { 'easy-canvas': EasyCanvasElement; }
}
