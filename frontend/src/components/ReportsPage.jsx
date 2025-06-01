import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const ReportsPage = () => {
    const [reportType, setReportType] = useState('monthly'); // 'monthly', 'quarterly', 'yearly'
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1); // 1-12 (getMonth() is 0-11)
    const [quarter, setQuarter] = useState(1); // 1-4

    const [reportData, setReportData] = useState(null); // Будет содержать { message, period, data: aggregatedData }
    const [isLoading, setIsLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState('');

    // Используй переменную окружения или дефолтное значение
    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

    // Опции для выбора года (например, текущий и 4 предыдущих)
    const yearOptions = [];
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 5; i++) {
        yearOptions.push(currentYear - i);
    }

    // Названия месяцев для выпадающего списка
    const monthNames = [ "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь" ];

    const handleGenerateReport = async () => {
        setIsLoading(true);
        setError('');
        setReportData(null); // Сбрасываем предыдущие данные

        const params = {
            type: reportType,
            year: year,
        };

        if (reportType === 'monthly') {
            if (!month) {
                toast.error("Пожалуйста, выберите месяц.");
                setIsLoading(false);
                return;
            }
            params.month = month;
        } else if (reportType === 'quarterly') {
            if (!quarter) {
                toast.error("Пожалуйста, выберите квартал.");
                setIsLoading(false);
                return;
            }
            params.quarter = quarter;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/api/reports`, {
                params,
                headers: { Authorization: `Bearer ${token}` }
            });
            // Теперь ожидаем, что response.data имеет структуру { message, period, data }
            setReportData(response.data); 
            if (response.data && response.data.data && Object.keys(response.data.data.transactions).length === 0 && !response.data.data.totalIncome && !response.data.data.totalExpense) {
                toast.info("Данные за выбранный период не найдены.");
            } else {
                toast.success("Отчет создан успешно!");
            }
        } catch (err) {
            console.error("Error generating report:", err);
            const message = err.response?.data?.error || "Не удалось сгенерировать отчет.";
            setError(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleExportCSV = async () => {
        setIsExporting(true);
        const params = {
            type: reportType,
            year: year,
        };
        if (reportType === 'monthly') params.month = month;
        if (reportType === 'quarterly') params.quarter = quarter;

        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/api/reports/export`, {
                params,
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob', // Важно для скачивания файла
            });
            
            const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' }); // Добавим charset
            const link = document.createElement('a');
            const url = window.URL.createObjectURL(blob);
            link.href = url;
            
            let filename = `report-${reportType}-${year}`;
            if (reportType === 'monthly' && month) filename += `-${String(month).padStart(2, '0')}`;
            if (reportType === 'quarterly' && quarter) filename += `-Q${quarter}`;
            filename += '.csv';
            
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url); // Освобождаем URL
            toast.success("Отчет успешно экспортирован!");

        } catch (err) {
             console.error("Error exporting report:", err);
             let errorMessage = "Failed to export report.";
             // Попытка извлечь сообщение об ошибке, если сервер вернул JSON вместо blob
             if (err.response && err.response.data && err.response.data instanceof Blob && err.response.data.type.includes('application/json')) {
                try {
                    const errorText = await err.response.data.text();
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.error || errorMessage;
                } catch (e) {
                    // Ошибка парсинга JSON, используем дефолтное сообщение
                }
             } else if (err.response && err.response.data && typeof err.response.data.error === 'string') {
                errorMessage = err.response.data.error;
             }
             toast.error(errorMessage);
        } finally {
            setIsExporting(false);
        }
    };

    // Сбрасываем месяц/квартал при смене типа отчета, чтобы избежать невалидных комбинаций
    useEffect(() => {
        if (reportType === 'yearly') {
            // Для годового отчета месяц/квартал не нужны
        } else if (reportType === 'monthly') {
            setMonth(new Date().getMonth() + 1); // Сбрасываем на текущий месяц
        } else if (reportType === 'quarterly') {
            setQuarter(Math.floor((new Date().getMonth()) / 3) + 1); // Сбрасываем на текущий квартал
        }
    }, [reportType]);


    return (
        <div className="reports-page-container" style={{ padding: '20px', maxWidth: '900px', margin: '20px auto', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '25px' }}>Финансовый отчет</h2>

            <div className="report-filters" style={{ marginBottom: '30px', padding: '20px', border: '1px solid #eee', borderRadius: '8px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-end' }}>
                <div>
                    <label htmlFor="reportType" style={{ display: 'block', marginBottom: '5px' }}>Тип отчета:</label>
                    <select id="reportType" value={reportType} onChange={e => setReportType(e.target.value)} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '150px' }}>
                        <option value="monthly">Месячный</option>
                        <option value="quarterly">Квартальный</option>
                        <option value="yearly">Годовой</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="year" style={{ display: 'block', marginBottom: '5px' }}>Год:</label>
                    <select id="year" value={year} onChange={e => setYear(parseInt(e.target.value))} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '100px' }}>
                        {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                {reportType === 'monthly' && (
                    <div>
                        <label htmlFor="month" style={{ display: 'block', marginBottom: '5px' }}>Месяц:</label>
                        <select id="month" value={month} onChange={e => setMonth(parseInt(e.target.value))} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '150px' }}>
                            {monthNames.map((name, index) => (
                                <option key={index + 1} value={index + 1}>{name}</option>
                            ))}
                        </select>
                    </div>
                )}
                {reportType === 'quarterly' && (
                    <div>
                        <label htmlFor="quarter" style={{ display: 'block', marginBottom: '5px' }}>Квартал:</label>
                        <select id="quarter" value={quarter} onChange={e => setQuarter(parseInt(e.target.value))} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '150px' }}>
                            <option value={1}>К1 (Янв-Мар)</option>
                            <option value={2}>К2 (Апр-Июнь)</option>
                            <option value={3}>К3 (Июль-Сен)</option>
                            <option value={4}>К4 (Окт-Дек)</option>
                        </select>
                    </div>
                )}
                <button onClick={handleGenerateReport} disabled={isLoading || isExporting} style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    {isLoading ? 'Генерация...' : 'Генерировать отчет'}
                </button>
            </div>

            {error && <div style={{ color: 'red', backgroundColor: '#f8d7da', border: '1px solid #f5c6cb', padding: '10px', borderRadius: '4px', marginBottom: '15px' }}>Ошибка: {error}</div>}

            {reportData && (
                <div className="report-display" style={{ marginTop: '20px', padding: '20px', border: '1px solid #eee', borderRadius: '8px' }}>
                    <h3>
                        Отчет для {reportType.charAt(0).toUpperCase() + reportType.slice(1)} - {
                        reportType === 'monthly' ? `${monthNames[month - 1]} ${year}` :
                        reportType === 'quarterly' ? `К${quarter} ${year}` :
                        year
                        }
                    </h3>
                    <p style={{ color: '#555', fontSize: '0.9em' }}>Период: {reportData.period?.startDate} до {reportData.period?.endDate}</p>
                    
                    <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                        <h4>Резюме</h4>
                        <p>Общий доход: <strong>{reportData.data?.totalIncome?.toFixed(2)}</strong></p>
                        <p>Общий расход: <strong>{reportData.data?.totalExpense?.toFixed(2)}</strong></p>
                        <p style={{ fontSize: '1.1em' }}>Чистый баланс: <strong style={{ color: (reportData.data?.netBalance ?? 0) >= 0 ? 'green' : 'red' }}>{reportData.data?.netBalance?.toFixed(2)}</strong></p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
                        {Object.keys(reportData.data?.incomeByCategory || {}).length > 0 && (
                            <div style={{ flex: 1, minWidth: '300px', marginBottom: '15px', padding: '15px', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
                                <h4>Доходы в разбивке по категориям</h4>
                                <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
                                    {Object.entries(reportData.data.incomeByCategory).map(([category, amount]) => (
                                        <li key={`inc-${category}`} style={{ padding: '5px 0', borderBottom: '1px dashed #f0f0f0' }}>
                                            {category}: <span style={{ float: 'right', fontWeight: 'bold' }}>{amount.toFixed(2)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {Object.keys(reportData.data?.expenseByCategory || {}).length > 0 && (
                            <div style={{ flex: 1, minWidth: '300px', marginBottom: '15px', padding: '15px', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
                                <h4>Расходы по категориям</h4>
                                <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
                                    {Object.entries(reportData.data.expenseByCategory).map(([category, amount]) => (
                                        <li key={`exp-${category}`} style={{ padding: '5px 0', borderBottom: '1px dashed #f0f0f0' }}>
                                            {category}: <span style={{ float: 'right', fontWeight: 'bold' }}>{amount.toFixed(2)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                    
                    {reportData.data?.transactions && reportData.data.transactions.length > 0 && (
                         <div style={{ marginTop: '20px' }}>
                            <h4>Транзакции за отчетный период</h4>
                            <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e0e0e0' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
                                    <thead style={{ backgroundColor: '#f0f0f0', position: 'sticky', top: 0 }}>
                                        <tr>
                                            <th style={{border: '1px solid #ddd', padding: '10px', textAlign: 'left'}}>Date</th>
                                            <th style={{border: '1px solid #ddd', padding: '10px', textAlign: 'left'}}>Type</th>
                                            <th style={{border: '1px solid #ddd', padding: '10px', textAlign: 'left'}}>Category</th>
                                            <th style={{border: '1px solid #ddd', padding: '10px', textAlign: 'right'}}>Amount</th>
                                            <th style={{border: '1px solid #ddd', padding: '10px', textAlign: 'left'}}>Description</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                    {reportData.data.transactions.map((t, index) => { // Добавил index для ключа лога, если t.id нет
                                    // --- НАЧАЛО ИЗМЕНЕНИЙ ДЛЯ ДАТЫ ---
                                    if (index < 5) { // Логируем только первые 5 для примера
                                        console.log(`[ReportsPage] Transaction (row ${index + 1}) raw date:`, t.date, "| type:", typeof t.date);
                                    }

                                    let displayDate = 'N/A';
                                    if (t.date) {
                                        try {
                                            let dateToParse = t.date;
                                            // Если дата уже строка YYYY-MM-DD, добавляем время для корректного UTC парсинга
                                            if (typeof dateToParse === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateToParse)) {
                                                dateToParse += 'T00:00:00Z';
                                            }
                                            
                                            const dateObj = new Date(dateToParse);
                                            
                                            if (!isNaN(dateObj.getTime())) {
                                                // Форматируем в DD.MM.YYYY (или другой формат, удобный пользователю)
                                                displayDate = dateObj.toLocaleDateString('ru-RU', { // Используем русскую локаль для формата ДД.ММ.ГГГГ
                                                    day: '2-digit', 
                                                    month: '2-digit', 
                                                    year: 'numeric' 
                                                });
                                            } else {
                                                console.warn(`[ReportsPage] Failed to parse date for transaction (row ${index + 1}): Original value was "${t.date}"`);
                                                displayDate = 'Invalid Date';
                                            }
                                        } catch (e) {
                                            console.error(`[ReportsPage] Error parsing date for transaction (row ${index + 1}): "${t.date}"`, e);
                                            displayDate = 'Error Parsing';
                                        }
                                    }
                                    // --- КОНЕЦ ИЗМЕНЕНИЙ ДЛЯ ДАТЫ ---

                                    return (
                                        <tr key={t.id || `trans-${index}`} style={{ borderBottom: '1px solid #eee' }}>
                                            <td style={{border: '1px solid #ddd', padding: '8px'}}>
                                              {displayDate} {/* Используем отформатированную дату */}
                                            </td>
                                            <td style={{border: '1px solid #ddd', padding: '8px'}}>{t.type}</td>
                                            <td style={{border: '1px solid #ddd', padding: '8px'}}>{t.category_name || 'N/A'}</td>
                                            <td style={{border: '1px solid #ddd', padding: '8px', textAlign: 'right', color: t.type === 'expense' ? 'red' : 'green'}}>{t.amount ? parseFloat(t.amount).toFixed(2) : 'N/A'}</td>
                                            <td style={{border: '1px solid #ddd', padding: '8px'}}>{t.description || ''}</td>
                                        </tr>
                                    );
                                })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <button 
                        onClick={handleExportCSV} 
                        disabled={isLoading || isExporting} 
                        style={{ marginTop: '30px', padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        {isExporting ? 'Экспорт...' : 'Экспорт в CSV'}
                    </button>
                </div>
            )}
            {/* Сообщение, если данные не загружены и нет ошибки (например, при первой загрузке страницы) */}
            {!reportData && !isLoading && !error && <p style={{ textAlign: 'center', marginTop: '20px', color: '#777' }}>Выберите период и сгенерируйте отчет, чтобы просмотреть данные.</p>}
        </div>
    );
};

export default ReportsPage;