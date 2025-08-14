import React, { useEffect, useMemo, useState } from "react";
import data from "./jobs_data.json";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";

// -------- Helpers (no regex literals) --------
const NON_NUM = new RegExp("[^0-9.\\-]", "g");
const toNumber = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return isFinite(v) ? v : null;
  const n = Number(String(v).replace(NON_NUM, ""));
  return isNaN(n) ? null : n;
};
const splitSkills = (s) =>
  !s ? [] : String(s).split(/[,;|/]| and /i).map(x => x.trim()).filter(Boolean);

// "2025-07-12" -> "2025-07"
const monthKey = (d) => {
  if (!d) return null;
  const dt = new Date(d);
  if (isNaN(dt.getTime())) {
    // fallback: try to extract YYYY-MM
    const m = String(d).match(/(19|20)\d{2}[-/\.](0?[1-9]|1[0-2])/);
    return m ? m[0].replace(/\./g, "-") : null;
  }
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};


const normalizeRow = (row) => {
  const title = row.job_title ?? null;
  const country = row.company_location || row.employee_residence || null; // can be ISO codes
  const salary = toNumber(row.salary_usd);
  const skills = splitSkills(row.required_skills);
  const yearMonth = monthKey(row.posting_date);
  const year = yearMonth ? Number(yearMonth.slice(0, 4)) : null;
  return { title, country, salary, skills, year, yearMonth };
};

export default function App() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    setRows(Array.isArray(data) ? data : (data?.rows ?? []));
  }, []);

  const norm = useMemo(() => rows.map(normalizeRow), [rows]);

  // 1) Top Roles (count)
  const topRoles = useMemo(() => {
    const map = {};
    norm.forEach(r => {
      if (!r.title) return;
      map[r.title] = (map[r.title] || 0) + 1;
    });
    return Object.entries(map)
      .map(([title, count]) => ({ title, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [norm]);

  // 2) Average Salary by Role
  const salaryByRole = useMemo(() => {
    const agg = {};
    norm.forEach(r => {
      if (!r.title || r.salary == null) return;
      const k = r.title;
      if (!agg[k]) agg[k] = { total: 0, cnt: 0 };
      agg[k].total += r.salary;
      agg[k].cnt += 1;
    });
    return Object.entries(agg)
      .map(([role, { total, cnt }]) => ({ role, avgSalary: Math.round(total / cnt) }))
      .filter(d => Number.isFinite(d.avgSalary))
      .sort((a, b) => b.avgSalary - a.avgSalary)
      .slice(0, 10);
  }, [norm]);

  // 3) Skills Demand
  const skillsDemand = useMemo(() => {
    const map = {};
    norm.forEach(r => r.skills.forEach(s => { map[s] = (map[s] || 0) + 1; }));
    return Object.entries(map)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [norm]);

  // 4) Jobs by Country
  const jobsByCountry = useMemo(() => {
    const map = {};
    norm.forEach(r => {
      if (!r.country) return;
      const k = String(r.country).trim();
      map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [norm]);

  // 5) Salary Trend Over Time (by month)
  const salaryTrend = useMemo(() => {
    const agg = {};
    norm.forEach(r => {
      if (!r.yearMonth || r.salary == null) return;
      if (!agg[r.yearMonth]) agg[r.yearMonth] = { total: 0, cnt: 0 };
      agg[r.yearMonth].total += r.salary;
      agg[r.yearMonth].cnt += 1;
    });
    return Object.entries(agg)
      .map(([ym, { total, cnt }]) => ({ month: ym, avgSalary: Math.round(total / cnt) }))
      .sort((a, b) => a.month.localeCompare(b.month)); // chronological
  }, [norm]);

  const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#22d3ee", "#a78bfa", "#f472b6", "#84cc16"];

  // Quick status (optional)
  const status = {
    rows: rows.length,
    roles: topRoles.length,
    salaryRoles: salaryByRole.length,
    skills: skillsDemand.length,
    countries: jobsByCountry.length,
    months: salaryTrend.length
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">🌍 AI Job Market Insights 2025</h1>

      <div className="bg-white shadow rounded-xl p-4 mb-6 text-sm text-gray-700">
        <div className="font-semibold mb-2">Dataset status</div>
        <div className="flex flex-wrap gap-4">
          <div>Rows: <span className="font-mono">{status.rows}</span></div>
          <div>Top Roles: <span className="font-mono">{status.roles}</span></div>
          <div>Salary Roles: <span className="font-mono">{status.salaryRoles}</span></div>
          <div>Skills: <span className="font-mono">{status.skills}</span></div>
          <div>Countries: <span className="font-mono">{status.countries}</span></div>
          <div>Months: <span className="font-mono">{status.months}</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Roles */}
        <div className="bg-white shadow-lg rounded-xl p-6 hover:shadow-2xl transition-shadow">
          <h2 className="text-xl font-semibold mb-4">Top AI Roles</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topRoles}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="title" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Average Salary by Role */}
        <div className="bg-white shadow-lg rounded-xl p-6 hover:shadow-2xl transition-shadow">
          <h2 className="text-xl font-semibold mb-4">Average Salary by Role</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salaryByRole}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="role" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="avgSalary" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
          {salaryByRole.length === 0 && (
            <p className="mt-3 text-sm text-gray-500">No salary data found in <code>salary_usd</code>.</p>
          )}
        </div>

        {/* Skills Demand */}
        <div className="bg-white shadow-lg rounded-xl p-6 hover:shadow-2xl transition-shadow">
          <h2 className="text-xl font-semibold mb-4">Top Skills in Demand</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={skillsDemand}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="skill" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
          {skillsDemand.length === 0 && (
            <p className="mt-3 text-sm text-gray-500">No skills found in <code>required_skills</code>.</p>
          )}
        </div>

        {/* Jobs by Country */}
        <div className="bg-white shadow-lg rounded-xl p-6 hover:shadow-2xl transition-shadow">
          <h2 className="text-xl font-semibold mb-4">Jobs by Country (Top 8)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={jobsByCountry} dataKey="count" nameKey="country" cx="50%" cy="50%" outerRadius={110} label>
                {jobsByCountry.map((entry, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          {jobsByCountry.length === 0 && (
            <p className="mt-3 text-sm text-gray-500">No countries found in <code>company_location</code> / <code>employee_residence</code>.</p>
          )}
        </div>

        {/* Salary Trend Over Time (Monthly) */}
        <div className="bg-white shadow-lg rounded-xl p-6 hover:shadow-2xl transition-shadow md:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Average Salary Trend (by Month)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salaryTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="avgSalary" stroke="#ef4444" />
            </LineChart>
          </ResponsiveContainer>
          {salaryTrend.length === 0 && (
            <p className="mt-3 text-sm text-gray-500">No valid dates in <code>posting_date</code> to build a monthly trend.</p>
          )}
        </div>
      </div>
    </div>
  );
}
