// Campaign sending time windows configuration
// Hours in 24-hour format
const ALLOWED_TIME_WINDOWS = {
  startHour: 9,  // 9 AM
  endHour: 21    // 9 PM
};

// Validate if a given date/time is within allowed windows
function isWithinAllowedTimeWindow(dateTime) {
  const hour = dateTime.getHours();
  return hour >= ALLOWED_TIME_WINDOWS.startHour && hour < ALLOWED_TIME_WINDOWS.endHour;
}

// Get next allowed time window if scheduled time is outside window
function getNextAllowedTime(dateTime) {
  const next = new Date(dateTime);
  const hour = next.getHours();
  
  if (hour < ALLOWED_TIME_WINDOWS.startHour) {
    // Before window, set to start of today's window
    next.setHours(ALLOWED_TIME_WINDOWS.startHour, 0, 0, 0);
  } else if (hour >= ALLOWED_TIME_WINDOWS.endHour) {
    // After window, set to start of next day's window
    next.setDate(next.getDate() + 1);
    next.setHours(ALLOWED_TIME_WINDOWS.startHour, 0, 0, 0);
  }
  
  return next;
}

module.exports = {
  ALLOWED_TIME_WINDOWS,
  isWithinAllowedTimeWindow,
  getNextAllowedTime
};

