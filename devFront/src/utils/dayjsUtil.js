import dayjs from 'dayjs';

export const getNowStr = () => {
  return dayjs().format('YYYY-MM-DD HH:mm:ss');
};
export const getNowDateStr = () => {
  return dayjs().format('YYYY-MM-DD');
};

export const getDateName = () => {
  return dayjs().format('YYYYMMDDHHmmss');
};

export const getFormatDate = (input) => {
  return dayjs(input).format('YYYY-MM-DD HH:mm:ss');
};

export const getStartAndEndTime = () => {
  const startDate = getFormatDate(new Date().setHours(0, 0, 0, 0));
  const endDate = getFormatDate(new Date().setHours(23, 59, 59, 999));
  return [startDate, endDate];
};
