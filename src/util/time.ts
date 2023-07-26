import { Times } from "../enums/time";

const changeTimeZone = (date: Date, tzOffset: number) => {
    if(date.getHours() >= tzOffset) {
        return new Date(date.setHours(date.getHours() - tzOffset));
    } else {
        return new Date(date.getTime() - Times.DAY*1000 + tzOffset*Times.HOUR*1000);
    }
}

export { changeTimeZone }