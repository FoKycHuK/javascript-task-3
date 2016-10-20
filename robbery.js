'use strict';

/**
 * Сделано задание на звездочку
 * Реализовано оба метода и tryLater
 */
exports.isStar = true;

var DAYS_OF_WEEK = ['ПН', 'ВТ', 'СР'];
var MS_IN_HOUR = 1000 * 60 * 60;
var MS_IN_DAY = MS_IN_HOUR * 24;

function createDate(day, hours, minutes) {
    // тут 1973 год подобран, чтоб первое января был понедельник :)
    // а day + 1 это потому, что нулевой день -- на самом деле день пред. месяца.
    return new Date(Date.UTC(73, 0, day + 1, hours, minutes));
}

function addDaysToDate(date, days) {
    var msToAdd = days * MS_IN_DAY;

    return new Date(date.getTime() + msToAdd);
}

function getUtcFromTime(string) {
    return parseInt(/\+(\d+)/.exec(string)[1]);
}

function parseTimeFromString(string) {
    var groups = /([А-Я]*)\s*(\d\d):(\d\d)\+(\d+)/.exec(string);
    var day = groups[1] ? DAYS_OF_WEEK.indexOf(groups[1]) : 0;
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

function parseInterval(interval) {
    return {
        from: parseTimeFromString(interval.from),
        to: parseTimeFromString(interval.to)
    };
}

function getIntervalsWhenBankClosed(bankTimeInterval, bankUtc) {
    var result = [];
    for (var i = 0; i < DAYS_OF_WEEK.length; i++) {
        result.push(
            {
                from: createDate(i, -bankUtc, 0),
                to: addDaysToDate(bankTimeInterval.from, i)
            });
        result.push(
            {
                from: addDaysToDate(bankTimeInterval.to, i),
                to: createDate(i + 1, -bankUtc, 0)
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
    return toTime - fromTime >= minutes * 60 * 1000;
}

function getEarliestMoment(busyList, duration, startTime, endTime) {
    busyList.sort(ascendingStartTimeComparator);
    for (var i in busyList) {
        if (endTime < startTime) {
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

function prettifyTime(time, template) {
    // getDay() возвращает для воскресенья 0: не комфильфо. Посему делаем -1
    var day = time.getDay() % 7 - 1;
    var hours = time.getHours().toString();
    var minutes = time.getMinutes().toString();
    if (hours.length === 1) {
        hours = '0' + hours;
    }
    if (minutes.length === 1) {
        minutes = '0' + minutes;
    }

    return template
        .replace('%DD', DAYS_OF_WEEK[day])
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
    // console.info(schedule, duration, workingHours);

    var bankUtc = getUtcFromTime(workingHours.from);
    var bankInterval = parseInterval(workingHours);
    var busyList = [];
    var bankBusyIntervals = getIntervalsWhenBankClosed(bankInterval, bankUtc);
    var startTime = bankBusyIntervals[0].from;
    var endTime = bankBusyIntervals[bankBusyIntervals.length - 1].to;

    unionSchedule(schedule).forEach(function (interval) {
        busyList.push(parseInterval(interval));
    });

    busyList = busyList.concat(bankBusyIntervals);

    var momentToAttack = getEarliestMoment(busyList, duration, startTime, endTime);

    return {
        busyList: busyList,
        currentMoment: momentToAttack,
        endTime: endTime,
        duration: duration,

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

            return prettifyTime(this.currentMoment, template);
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

            var nextStartTime = new Date(this.currentMoment.getTime() + MS_IN_HOUR / 2);
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
