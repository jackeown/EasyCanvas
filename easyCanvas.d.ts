/** Types for the existing classic-script browser bundle. No runtime exports. */
export interface PlotLabels {
  /** Hover values are shown by default on every chart helper. */
  showTooltips?: boolean;
  axes?: boolean;
  showTitle?: boolean;
  showAxisLabels?: boolean;
  showTickLabels?: boolean;
  showLegend?: boolean;
  title?: string;
  xLabel?: string;
  yLabel?: string;
  legendLabels?: string[];
  colors?: string[];
  autoScale?: boolean;
}
export interface TimeAxisOptions {
  /** Browser locale by default, for example en-GB or de-AT. */
  locale?: string;
  /** Browser timezone by default; UTC or an IANA zone such as Europe/Vienna. */
  timeZone?: string;
  timeFormat?: Intl.DateTimeFormatOptions;
  xTickFormat?: (value: number) => string;
  yTickFormat?: (value: number) => string;
}
export interface LinePlotSettings extends PlotLabels, TimeAxisOptions {
  inputs?: string[];
  outputs?: string[];
  lineWidth?: number;
  tooltips?: string[];
  tooltipFormatters?: Record<string, (value: number, index: number) => string>;
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
  color?: string;
  x: number; y: number; text: string;
  theta?: number;
  font?: string;
  textAlign?: CanvasTextAlign;
  textBaseline?: CanvasTextBaseline;
}
export interface DefaultAxesSettings extends TimeAxisOptions {
  showTickLabels?: boolean;
  axisColor?: string;
  textColor?: string;
  xTicks?: number; yTicks?: number;
  xAxisIsTime?: boolean; yAxisIsTime?: boolean;
}
export interface AxisSettings extends Pick<TimeAxisOptions, "locale" | "timeZone" | "timeFormat"> {
  tickFormat?: (value: number) => string;
  axisColor?: string;
  textColor?: string;
  x1: number; y1: number; x2: number; y2: number;
  labelXOffset: number; labelYOffset: number; labelTheta: number;
  nTicks: number;
  labels?: string[];
  scaleStart?: number; scaleEnd?: number;
  isDatetime?: boolean;
}
export interface ChartSettings extends PlotLabels, DefaultAxesSettings {
  /** Format tooltip fields such as Value, X, Y, Count or Median. */
  tooltipFormatters?: Record<string, (value: number | string, index: number) => string>;
  color?: string;
  axes?: boolean;
}
export interface HistogramSettings extends ChartSettings {
  bins?: number;
  range?: [number, number];
  density?: boolean;
  gap?: number;
}
export interface HistogramBin { min: number; max: number; count: number; height: number; }
export interface PieSettings extends PlotLabels {
  color?: string;
  labels?: string[];
  innerRadius?: number;
  startAngle?: number;
  showLabels?: boolean;
  showLegend?: boolean;
  tooltipFormatters?: Record<string, (value: number | string, index: number) => string>;
  labelFormatter?: (value: number, index: number, fraction: number) => string;
  tooltipFormatter?: (value: number, index: number, fraction: number) => string;
  labelColor?: string;
}
export interface BoxSettings extends ChartSettings {
  whiskerFactor?: number;
  boxWidth?: number;
  showOutliers?: boolean;
}
export interface BoxSummary {
  label?: string;
  q1: number;
  median: number;
  q3: number;
  low: number;
  high: number;
  outliers: number[];
}
export interface XYData { xs: number[]; ys: number[]; }
export interface ScatterData extends XYData { radii?: number[]; }
export interface ScatterSettings extends ChartSettings { radius?: number; opacity?: number; }
/** One y array, multiple y arrays sharing xs, or named columns selected by outputs/inputs. */
export type AreaData = XYData | {xs: number[]; ys: number[][]} | Record<string, number[]>;
export interface AreaSettings extends ChartSettings {
  /** Stack positive and negative values separately; all series must share x coordinates. */
  stacked?: boolean;
  outputs?: string[];
  inputs?: string[];
  baseline?: number;
  opacity?: number;
  lineWidth?: number;
}
export interface HeatmapSettings extends ChartSettings {
  range?: [number, number];
  colorScale?: (value: number, fraction: number) => string;
}
export interface RichTextOptions {
  richText?: (context: CanvasRenderingContext2D, text: string, x: number, y: number,
    font: string, align: CanvasTextAlign, color: CanvasRenderingContext2D['fillStyle']) => boolean;
}
export interface RichCanvasElement extends EasyCanvasElement {
  requestRender(): void;
  getDrawingContext(): CanvasRenderingContext2D;
  disposeRichRendering(): void;
}
export type ChartThemeName = 'light' | 'dark' | 'paper' | 'forest' | 'midnight' | 'blueprint';
export interface ChartThemeColors {
  fontFamily: string;
  titleFontFamily?: string;
  fontWeight: number | string;
  titleWeight: number | string;
  background: string;
  foreground: string;
  axes: string;
  border: string;
  muted: string;
  tooltipBackground: string;
  legendBackground: string;
  sliceLabel: string;
  palette: string[];
}
export interface CanvasLayout {
  left: number; right: number; top: number; bottom: number;
  fontSize: number; titleSize: number; labelSize: number;
  gap: number; tickLength: number; xTicks: number; yTicks: number;
  legendTop: number; radial: boolean; automatic: boolean;
}
export interface EasyCanvasElement extends HTMLElement {
  autoLayout: boolean;
  autoFontSize: boolean;
  autoPadding: boolean;
  autoTicks: boolean;
  autoResize: boolean;
  autoRender: boolean;
  layout?: CanvasLayout;
  updateLayout(settings?: LinePlotSettings): void;
  theme: 'auto' | ChartThemeName;
  readonly availableThemes: ('auto' | ChartThemeName)[];
  readonly resolvedTheme: ChartThemeName;
  getFont(size?: number, kind?: 'body' | 'title'): string;
  get themeColors(): ChartThemeColors;
  set themeColors(value: Partial<ChartThemeColors> | null);

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
    linePlot(data: LinePlotData, settings?: LinePlotSettings): void;
    barPlot(data: BarPlotData, settings?: ChartSettings): void;
    histogram(data: number[] | {values: number[]}, settings?: HistogramSettings): HistogramBin[];
    pieChart(data: number[] | {values: number[]; labels?: string[]}, settings?: PieSettings): void;
    donutChart(data: number[] | {values: number[]; labels?: string[]}, settings?: PieSettings): void;
    boxPlot(data: number[] | Record<string, number[]>, settings?: BoxSettings): BoxSummary[];
    scatterPlot(data: ScatterData, settings?: ScatterSettings): void;
    bubblePlot(data: ScatterData, settings?: ScatterSettings): void;
    areaPlot(data: AreaData, settings?: AreaSettings): void;
    heatmap(data: (number | null)[][], settings?: HeatmapSettings): void;
    drawTooltip(x: number, y: number, info: Record<string, unknown>): void;
  };
  scaleX(value: number): number;
  scaleY(value: number): number;
  scaleXInverse(value: number): number;
  scaleYInverse(value: number): number;
  updateScales(): void;
  fixDPI(force?: boolean): void;
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
  /** Available after loading the optional easyCanvasRichText.js script. */
  function enhanceEasyCanvas(plot: EasyCanvasElement, options?: RichTextOptions): RichCanvasElement;
  interface HTMLElementTagNameMap { 'easy-canvas': EasyCanvasElement; }
}
