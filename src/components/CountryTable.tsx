import React from 'react';
import { CountryStat } from '../types';
import { countryCodeToFlagEmoji } from '../utils/countryFlag';

interface CountryTableProps {
  countries: CountryStat[];
}

export const CountryTable: React.FC<CountryTableProps> = React.memo(({ countries }) => {
  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Country</th>
            <th>Flag</th>
            <th>Users</th>
            <th>Percentage</th>
          </tr>
        </thead>
        <tbody>
          {countries.map((country, index) => (
            <tr key={country.countryCode}>
              <td>{index + 1}</td>
              <td>{country.countryName}</td>
              <td className="country-flag-cell">{countryCodeToFlagEmoji(country.countryCode)}</td>
              <td>{country.userCount.toLocaleString()}</td>
              <td>{country.percentage.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

CountryTable.displayName = 'CountryTable';

export default CountryTable;
