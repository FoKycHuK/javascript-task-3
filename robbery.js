'use strict';

/**
 * Сделано задание на звездочку
 * Реализовано оба метода и tryLater
 */
exports.isStar = true;

var BANK_WORKING_DAYS = ['ПН', 'ВТ', 'СР'];
var MS_IN_MINUTE = 1000 * 60;
var MS_IN_HOUR = MS_IN_MINUTE * 60;
var MS_IN_DAY = MS_IN_HOUR * 24;

function createDate(day, hours, minutes) {
    // тут 1973 год подобран, чтоб первое января был понедельник :)
    // а day + 1 это потому, что нулевой день -- на самом деле день пред. месяца.
    // таким образом, при вызове этого метода с аргументами (0,0,0) мы получим ПН 00:00+0
    return new Date(Date.UTC(73, 0, day + 1, hours, minutes));
}

function addToDate(date, days, hours, minutes) {
    var msToAdd = days * MS_IN_DAY + hours * MS_IN_HOUR + minutes * MS_IN_MINUTE;

    return new Date(date.getTime() + msToAdd);
}

function parseTimeZoneFromString(string) {
    return parseInt(/\+(\d+)/.exec(string)[1]);
}

function parseUtcTimeFromString(string) {
    var groups = /([А-Я]*)\s*(\d\d):(\d\d)\+(\d+)/.exec(string);
    var day = groups[1] ? BANK_WORKING_DAYS.indexOf(groups[1]) : 0;
    var hour = parseInt(groups[2]);
    var minutes = parseInt(groups[3]);
    var utc = parseInt(groups[4]);

    return createDate(day, hour - utc, minutes);
}

function unionSchedule(schedule) {
    var result = [];
    Object.keys(schedule).forEach(function (personSchedule) {
        result = result.concat(schedule[personSchedule]);
    });

    return result;
}

function parseTimeInterval(interval) {
    return {
        from: parseUtcTimeFromString(interval.from),
        to: parseUtcTimeFromString(interval.to)
    };
}

function getIntervalsWhenBankClosed(bankTimeInterval, bankTimeZone) {
    var result = [];
    for (var i = 0; i < BANK_WORKING_DAYS.length; i++) {
        result.push(
            {
                from: createDate(i, -bankTimeZone, 0),
                to: addToDate(bankTimeInterval.from, i, 0, 0)
            });
        result.push(
            {
                from: addToDate(bankTimeInterval.to, i, 0, 0),
                to: createDate(i + 1, -bankTimeZone, 0)
            });
    }

    return result;
}

function ascendingStartTimeComparator(firstInterval, secondInterval) {
    if (firstInterval.from < secondInterval.from) {
        return -1;
    }
    if (firstInterval.from > secondInterval.from) {
        return 1;
    }

    return 0;
}

function canPlaceTimeInInterval(fromTime, toTime, minutes) {
    return toTime - fromTime >= minutes * MS_IN_MINUTE;
}

function getEarliestMoment(busyList, duration, startTime, endTime) {
    busyList.sort(ascendingStartTimeComparator);
    for (var i in busyList) {
        if (endTime <= startTime) {
            return null;
        }
        var currentInterval = busyList[i];
        if (canPlaceTimeInInterval(startTime, currentInterval.from, duration)) {
            return startTime;
        }
        if (startTime < currentInterval.to) {
            startTime = currentInterval.to;
        }
    }

    return null;
}

function prettifyTime(time, template, bankTimeZone) {
    time = addToDate(time, 0, bankTimeZone, 0);
    // getDay() возвращает для воскресенья 0: не комфильфо. Посему делаем -1
    var day = time.getUTCDay() % 7 - 1;
    var hours = time.getUTCHours().toString();
    var minutes = time.getUTCMinutes().toString();
    if (hours.length === 1) {
        hours = '0' + hours;
    }
    if (minutes.length === 1) {
        minutes = '0' + minutes;
    }

    return template
        .replace('%DD', BANK_WORKING_DAYS[day])
        .replace('%HH', hours)
        .replace('%MM', minutes);
}

/**
 * @param {Object} schedule – Расписание Банды
 * @param {Number} duration - Время на ограбление в минутах
 * @param {Object} workingHours – Время работы банка
 * @param {String} workingHours.from – Время открытия, например, "10:00+5"
 * @param {String} workingHours.to – Время закрытия, например, "18:00+5"
 * @returns {Object}
 */
exports.getAppropriateMoment = function (schedule, duration, workingHours) {
    var bankTimeZone = parseTimeZoneFromString(workingHours.from);
    var bankInterval = parseTimeInterval(workingHours);
    var bankBusyIntervals = getIntervalsWhenBankClosed(bankInterval, bankTimeZone);

    var busyList = unionSchedule(schedule)
        .map(parseTimeInterval)
        .concat(bankBusyIntervals);

    var startTime = bankBusyIntervals[0].from;
    var endTime = bankBusyIntervals[bankBusyIntervals.length - 1].to;

    var momentToAttack = getEarliestMoment(busyList, duration, startTime, endTime);

    return {
        busyList: busyList,
        currentMoment: momentToAttack,
        endTime: endTime,
        duration: duration,
        bankTimeZone: bankTimeZone,

        /**
         * Найдено ли время
         * @returns {Boolean}
         */
        exists: function () {
            return this.currentMoment !== null;
        },

        /**
         * Возвращает отформатированную строку с часами для ограбления
         * Например,
         *   "Начинаем в %HH:%MM (%DD)" -> "Начинаем в 14:59 (СР)"
         * @param {String} template
         * @returns {String}
         */
        format: function (template) {
            if (!this.exists()) {
                return '';
            }

            return prettifyTime(this.currentMoment, template, this.bankTimeZone);
        },

        /**
         * Попробовать найти часы для ограбления позже [*]
         * @star
         * @returns {Boolean}
         */
        tryLater: function () {
            if (!this.exists()) {
                return false;
            }

            var nextStartTime = addToDate(this.currentMoment, 0, 0, 30);
            var newMoment = getEarliestMoment(
                this.busyList, this.duration, nextStartTime, this.endTime);
            if (!newMoment) {
                return false;
            }
            this.currentMoment = newMoment;

            return true;
        }
    };
};
