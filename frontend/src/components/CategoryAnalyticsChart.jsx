import React from 'react';
import CategoryChart from './CategoryChart';

const CategoryAnalyticsChart = ({ dateRange }) => (
  <div className="row">
    <div className="col-md-6">
      <h5>Доходы по категориям</h5>
      <CategoryChart type="income" dateRange={dateRange} />
    </div>
    <div className="col-md-6">
      <h5>Расходы по категориям</h5>
      <CategoryChart type="expense" dateRange={dateRange} />
    </div>
  </div>
);

export default CategoryAnalyticsChart;