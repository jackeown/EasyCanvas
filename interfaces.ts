interface Point {
    x: number,
    y: number
}

interface LabelSettings {
    x:number;
    y:number;
    text: string;
    theta?: number;
    font?: "20pt Lato" | string;
    textAlign?: "left" | "right" | "center" | "start" | "end";
    textBaseline?: "top" | "hanging" | "middle" | "alphabetic" | "ideographic" | "bottom";
}

interface BarPlotData {
    bars: string[];
    heights: number[];
}

interface BarPlotSettings {
    autoScale?: boolean;
    title: string;
    xLabel?: string;
    yLabel?: string;
    legendLabels?: string[];
    colors?: string[];
    barWidth?: number;
}

export {Point, LabelSettings, BarPlotData, BarPlotSettings};