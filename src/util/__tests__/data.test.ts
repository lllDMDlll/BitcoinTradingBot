import {DataUtil} from '../data';
import {daySwingCandlesWithHighAndLow, daySwingCandlesWithLow} from "../../testData/DaySwings";
import {Swing, SwingType} from "../../types/Swing";
import {dayRangeCandles} from "../../testData/DayRangeCandles";

let dataUtil: DataUtil;

describe("DataUtil", () => {
    beforeEach(() => {
        dataUtil = new DataUtil();
    });

    describe("isWorkHours", () => {
        const monWorkHours = new Date(1675711809*1000);
        const monNonWorkHours = new Date(1675668609*1000);
        const satWorkHours = new Date(1675539009*1000);
        test("should return true if during work hours", () => {
            expect(dataUtil.isWorkHours(monNonWorkHours)).toEqual(false);
            expect(dataUtil.isWorkHours(monWorkHours)).toEqual(true);
        });
        test("should return false if not work day", () => {
            expect(dataUtil.isWorkHours(satWorkHours)).toEqual(false);
        });
    });

    describe("setRanges", () => {
        test("should properly set the ranges", () => {
            const currentTime = 1675710000;

            const halfDayHigh = 2;
            const halfDayLow = 0;
            const halfDayMid = 1.5;
            const dayHigh = 3;
            const dayLow = 0;
            const dayMid = 1.75;
            const twoDayHigh = 3;
            const twoDayLow = 0;
            const twoDayMid = 2;

            dataUtil.setRanges(dayRangeCandles, currentTime);

            const halfDay = dataUtil.getHalfDayRange();
            const day = dataUtil.getDayRange();
            const twoDay = dataUtil.getTwoDayRange();

            expect(halfDay?.high).toEqual(halfDayHigh);
            expect(halfDay?.low).toEqual(halfDayLow);
            expect(halfDay?.middle).toEqual(halfDayMid);
            expect(day?.high).toEqual(dayHigh);
            expect(day?.low).toEqual(dayLow);
            expect(day?.middle).toEqual(dayMid);
            expect(twoDay?.high).toEqual(twoDayHigh);
            expect(twoDay?.low).toEqual(twoDayLow);
            expect(twoDay?.middle).toEqual(twoDayMid);
        });
    });
    describe("getLastDaySwing", () => {
        test("should detect swing low", () => {
            const expected = new Swing(21679.1, 20395.5, 1674086400, SwingType.Low);
            const received = dataUtil.getLastDaySwing(daySwingCandlesWithHighAndLow, 1674240000);
            expect(received).toBeDefined();
            expect(received?.high).toEqual(expected.high);
            expect(received?.low).toEqual(expected.low);
            expect(received?.time).toEqual(expected.time);
            expect(received?.type).toEqual(expected.type);

            const expected2 = new Swing(23317.9, 22519.2, 1675123200, SwingType.Low)
            const received2 = dataUtil.getLastDaySwing(daySwingCandlesWithLow, 1675370000);
            expect(received2).toBeDefined();
            expect(received2?.high).toEqual(expected2.high);
            expect(received2?.low).toEqual(expected2.low);
            expect(received2?.time).toEqual(expected2.time);
            expect(received2?.type).toEqual(expected2.type);
        });
        test("should detect swing high", () => {
            const expected = new Swing(21679.1, 20395.5, 1674000000, SwingType.High);
            const received = dataUtil.getLastDaySwing(daySwingCandlesWithHighAndLow, 1674156628);
            expect(received).toBeDefined();
            expect(received?.high).toEqual(expected.high);
            expect(received?.low).toEqual(expected.low);
            expect(received?.time).toEqual(expected.time);
            expect(received?.type).toEqual(expected.type);
        });
    });
    describe("getLongSLTP", () => {
        test("should calculate stop loss and take profit for long positions", () => {
            const entryPrice = 27704;
            const expected = {
                TakeProfit: 27911.78,
                StopLoss: 27634.74
            }
            const actual = dataUtil.getLongSLTP(entryPrice);
            expect(actual).toEqual(expected);
        });
    });
    describe("getShortSLTP", () => {
        test("should calculate stop loss and take profit for short positions", () => {
            const entryPrice = 27704;
            const expected = {
                TakeProfit: 27496.22,
                StopLoss: 27773.26
            }
            const actual = dataUtil.getShortSLTP(entryPrice);
            expect(actual).toEqual(expected);
        });
    });
});