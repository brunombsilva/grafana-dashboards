const holidays = ["10-5", "11-1", "12-1", "12-8", "12-25", "1-1"];
const weekends = [0, 6];

// Only considers (some) fixed date holidays
function getNumWorkDays(startDate, endDate) {
  var numWorkDays = 0;
  var currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const isWeekend = weekends.includes(currentDate.getDay());
    const isHoliday = holidays.includes(
      `${currentDate.getMonth() + 1}-${currentDate.getDate() + 1}`
    );
    if (!isWeekend && !isHoliday) {
      numWorkDays++;
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }
  return numWorkDays;
}

module.exports = {
  getNumWorkDays
};
