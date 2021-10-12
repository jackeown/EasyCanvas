function computeMask(boolSeries){
    //boolSeries is a bit of a misnomer- there can be NaNs, zeros, and non-zeros.
    RegionList=[]
    currentRegionStart=0
    currentRegionOn=isOn(boolSeries[0])
    for(i=1; i<boolSeries.length; i++){
        if (currentRegionOn!==isOn(boolSeries[i])){
            if (currentRegionOn===true){
                RegionList.push({'start':currentRegionStart, 'end':i});
            }
            currentRegionOn=!currentRegionOn;
            currentRegionStart=i;
        }
    }
    if(currentRegionOn===true && isOn(boolSeries[boolSeries.length-1])){
        RegionList.push(Object({'start':currentRegionStart, 'end':boolSeries.length-1}))
    }
    return RegionList
}


function tsifyMask(RegionList, timestampList){
    return RegionList.map(elem => {return {"start": timestampList[elem['start']], "end": timestampList[elem['end']]}})
}

function isOn(number){
    return !([null, 0].includes(number))
}

function drawMask(RegionList, fillstyle="rgba(255,0,0,0.2)", filltop=undefined, fillbottom=undefined, text=''){
    //regions should have a start timestamp, and an end timestamp, and a hover text.
    if (fillbottom===undefined){
        fillbottom = this.ymin;
    }
    if (filltop===undefined){
        filltop = this.ymax;
    }
    for (let region of RegionList){
        let t2 = region["end"];
        let t1 = region["start"];
        this.ctx.save();
        this.ctx.font = "30px Arial";
        this.ctx.fillText(text, this.scaleX(t1), (this.scaleY(filltop)+this.scaleY(fillbottom))/2);
        this.ctx.fillStyle=fillstyle;
        this.ctx.beginPath();
        this.rect(t1,fillbottom,t2-t1,filltop-fillbottom);
        this.ctx.fill();
        this.ctx.closePath();
        this.ctx.restore()
    }
}

module.exports = {
    "computeMask": computeMask,
    "tsifyMask": tsifyMask,
    "drawMask": drawMask
}