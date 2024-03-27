import { BarPlotData, BarPlotSettings } from "./interfaces";
import { EasyCanvas } from "./easyCanvas";


const data2 : BarPlotData = {
    "bars": ["Ice Cream", "Cake", "Donuts", "Key-lime pie","Kale","Fudge"],
    "heights": [5,10,30,35,3,50]
}

const settings2: BarPlotSettings = {
    title: "Dessert Sales",
    xLabel: "Flavors",
    yLabel: "Pounds of Product Sold",
    legendLabels: data2.bars
}

// example canvas 2
const ec2 : EasyCanvas = document.getElementById("example2") as EasyCanvas;
ec2.drawingLoop = function(){
    this.hotAndReady.barPlot(data2,settings2);
}.bind(ec2);

export {settings2};