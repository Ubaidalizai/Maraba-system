const StockDamage = require('../models/stockDamage.model');
const { buildSaleDateFilter } = require('./dateRange');

const aggregateDamageLoss = async (startDate, endDate) => {
  const dateRange = buildSaleDateFilter(startDate, endDate);
  const match = { isDeleted: false };
  if (dateRange) match.damageDate = dateRange;

  const result = await StockDamage.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalDamageLoss: { $sum: '$totalLossAmount' },
        damageCount: { $sum: 1 },
      },
    },
  ]);

  return {
    totalDamageLoss: result[0]?.totalDamageLoss || 0,
    damageCount: result[0]?.damageCount || 0,
  };
};

const aggregateDamageLossByPeriod = async (dateRange, groupBy) => {
  let dateGroupStage;
  switch (groupBy) {
    case 'day':
      dateGroupStage = {
        _id: {
          year: { $year: '$damageDate' },
          month: { $month: '$damageDate' },
          day: { $dayOfMonth: '$damageDate' },
        },
      };
      break;
    case 'week':
      dateGroupStage = {
        _id: {
          year: { $year: '$damageDate' },
          week: { $week: '$damageDate' },
        },
      };
      break;
    case 'month':
      dateGroupStage = {
        _id: {
          year: { $year: '$damageDate' },
          month: { $month: '$damageDate' },
        },
      };
      break;
    default:
      dateGroupStage = {
        _id: {
          year: { $year: '$damageDate' },
          month: { $month: '$damageDate' },
          day: { $dayOfMonth: '$damageDate' },
        },
      };
  }

  return StockDamage.aggregate([
    { $match: { isDeleted: false, damageDate: dateRange } },
    {
      $group: {
        ...dateGroupStage,
        stockDamageLoss: { $sum: '$totalLossAmount' },
      },
    },
  ]);
};

module.exports = {
  aggregateDamageLoss,
  aggregateDamageLossByPeriod,
};
