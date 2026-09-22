import React from 'react';
import { cn } from '../../utils/cn';

export function Table({ columns, rows, empty = 'No data', rowKey = (r, i) => i, onRowClick, className }) {
  return (
    <div className={cn('overflow-x-auto rounded-xl border border-border', className)}>
      <table className="w-full border-collapse bg-white">
        <thead className="bg-surface">
          <tr>{columns.map((c) => <th key={c.key} className="th">{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td className="td text-center text-text-secondary py-10" colSpan={columns.length}>{empty}</td></tr>
          )}
          {rows.map((row, i) => (
            <tr
              key={rowKey(row, i)}
              className={cn('transition-colors hover:bg-surface/70', onRowClick && 'cursor-pointer')}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((c) => (
                <td key={c.key} className="td">{c.render ? c.render(row, i) : row[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
