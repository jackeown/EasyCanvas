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


export {Point, LabelSettings}