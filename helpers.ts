let defaultColors = ["red", "green","orange", "blue", "purple", "yellow"];

function zip(xs,ys){
    return xs.map((v,i)=>[v,ys[i]])
}

function defaultVal(original,def){
    if(original === undefined){
        return def;
    }
    return original;
}

function defaultVals(obj,keys,defs){
    return keys.map((k,i) => defaultVal(obj[k],defs[i]));
}

function dist(x1, y1, x2?: number, y2?: number){
    // compute pointwise distance treating x1 as one point and y1 as another.
    // hack because js doesn't have function overloading...
    if(x2 === undefined && y2 === undefined){
        return dist(x1.x, x1.y, y1.x, y1.y);
    }

    return Math.sqrt(Math.pow(x2-x1,2) + Math.pow(y2-y1,2));
}

function getTimeLabel(i, nTicks, scaleStart, scaleEnd){
    let start: any = new Date(scaleStart);
    let now: any = new Date(scaleStart + (scaleEnd-scaleStart)*(i/nTicks));
    let end: any = new Date(scaleEnd);

    let label: any = now.getFullYear();

    let secondLength = 1000;
    let minuteLength = secondLength*60;
    let hourLength = minuteLength*60;
    let dayLength = hourLength*24;
    let monthLength = dayLength*30;
    let yearLength = dayLength*365;

    // years
    if(end - start > yearLength){
        label = `${now.getFullYear()}`;
    }

    // months
    else if(end - start > monthLength){
        label = `${now.getMonth()+1}/${now.getFullYear()}`;
    }

    // days
    else if(end - start > dayLength){
        label = `${now.getMonth()+1}/${now.getDate()}`;
    }

    // hours
    else if(end - start > hourLength){
        label = `${now.getHours()}h:${now.getMinutes()}m`;
    }

    // minutes
    else if(end - start > minuteLength){
        label = `${now.getMinutes()}m:${now.getSeconds()}s`;
    }

    // seconds
    else if(end - start > secondLength){
        label = `${now.getSeconds()}s`;
    }

    // milliseconds
    else{
        label = `${now.getMilliseconds()}ms`;
    }

    return label;
}




export { defaultColors,zip, defaultVal, defaultVals, dist, getTimeLabel }

// module.exports = {
//     "defaultColors": defaultColors,
//     "zip":zip,
//     "defaultVal": defaultVal,
//     "defaultVals": defaultVals,
//     "dist": dist,
//     "getTimeLabel": getTimeLabel
// }


