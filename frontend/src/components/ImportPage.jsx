import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const ImportPage = () => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState(null); // Для хранения ответа от сервера

    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
        setImportResult(null); // Сбрасываем предыдущие результаты при выборе нового файла
    };

    const handleImport = async () => {
        if (!selectedFile) {
            toast.error('Выберите CSV-файл для импорта.');
            return;
        }

        setIsImporting(true);
        setImportResult(null);
        const formData = new FormData();
        formData.append('csvFile', selectedFile); // 'csvFile' - должно совпадать с именем в multer.single() на бэкенде

        try {
            const token = localStorage.getItem('token');
            console.log('[ImportPage] Sending import request...');
            const response = await axios.post(`${API_BASE_URL}/api/import/transactions/csv`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`,
                },
            });
        
            console.log('[ImportPage] Received response from server:', response);
            console.log('[ImportPage] Response data:', response.data);
        
            setImportResult(response.data);
        
            if (response.data && response.data.success) { // Добавил проверку на response.data
                let successMsg = response.data.message || "Импорт завершен.";
                if (response.data.summary) {
                    successMsg += ` (Импортировано: ${response.data.summary.imported || 0}, Ошибки проверки: ${response.data.summary.failedValidation || 0}, Ошибки сохранения: ${response.data.summary.failedOnSave || 0})`;
                }
                console.log('[ImportPage] Showing success toast:', successMsg);
                toast.success(successMsg);
            } else {
                const errorMsg = response.data?.message || 'Сервер сообщил, что импорт не был выполнен успешно.';
                console.warn('[ImportPage] Import not successful (server-side):', errorMsg, response.data);
                toast.error(errorMsg);
            }
        } catch (err) {
            console.error('[ImportPage] Axios or other error during import:', err);
            console.error('[ImportPage] Error response data (if any):', err.response?.data);
            
            const message = err.response?.data?.message || 'Во время импорта произошла неизвестная ошибка.';
            setImportResult({ 
                success: false, 
                message, 
                errors: err.response?.data?.errors || [], 
                summary: err.response?.data?.summary // Попробуем достать summary и из ошибки
            });
            toast.error(message);
        } finally {
            setIsImporting(false);
            console.log('[ImportPage] Import attempt finished.');
        }
    };

    // Вспомогательная функция для отображения ошибок
    const renderErrors = (errors) => {
        if (!errors || errors.length === 0) return null;
        return (
            <div style={{ marginTop: '15px', maxHeight: '200px', overflowY: 'auto', border: '1px solid #dc3545', padding: '10px', borderRadius: '4px', backgroundColor: '#f8d7da' }}>
                <h5 style={{ color: '#721c24', marginBottom: '10px' }}>Import Issues:</h5>
                <ul style={{ paddingLeft: '20px', margin: 0 }}>
                    {errors.map((err, index) => (
                        <li key={index} style={{ color: '#721c24', marginBottom: '5px', fontSize: '0.9em' }}>
                            {err.rowIndex && `Row ${err.rowIndex}: `}
                            {err.field && `Field "${err.field}": `}
                            {err.message}
                        </li>
                    ))}
                </ul>
            </div>
        );
    };


    return (
        <div className="import-page-container" style={{ padding: '20px', maxWidth: '700px', margin: '20px auto', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '25px' }}>Импорт транзакций из CSV</h2>

            <div className="csv-format-info" style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', border: '1px solid #eee', borderRadius: '4px', fontSize: '0.9em' }}>
                <p><strong>Пожалуйста, убедитесь, что ваш CSV-файл содержит следующие заголовки (в любом порядке, без учета регистра):</strong></p>
                <ul>
                    <li><code>Date</code> (формат: YYYY-MM-DD или DD.MM.YYYY)</li>
                    <li><code>Type</code> (значения: "income" или "expense"; или "доход", "расход")</li>
                    <li><code>Category</code> (название существующей категории)</li>
                    <li><code>Description</code> (опционально)</li>
                    <li><code>Amount</code> (положительное число, например, 100.50 или 100,50)</li>
                </ul>
                <p>Первая строка вашего CSV-файла должна содержать эти заголовки.</p>
                <p>Вы можете экспортировать данные из раздела "Отчеты", чтобы получить CSV в нужном формате.</p>
                <p>До испорта CSV-файл рекомендуем сохранять в кодировке UTF-8 и в формате CSV (разделители - запятые), если он был отредактирован</p>
            </div>

            <div className="file-upload-section" style={{ marginBottom: '20px' }}>
                <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    style={{ display: 'block', marginBottom: '10px', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', width: '100%' }}
                    disabled={isImporting}
                />
                <button
                    onClick={handleImport}
                    disabled={!selectedFile || isImporting}
                    style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1em' }}
                >
                    {isImporting ? 'Испортируем...' : 'Импорт выбранного файла CSV'}
                </button>
            </div>

            {importResult && (
                <div className="import-result" style={{ marginTop: '20px', padding: '15px', border: `1px solid ${importResult.success ? '#28a745' : '#dc3545'}`, borderRadius: '4px', backgroundColor: importResult.success ? '#d4edda' : '#f8d7da' }}>
                    <h4 style={{ color: importResult.success ? '#155724' : '#721c24' }}>
                        Импорт {importResult.success ? 'Успешно' : 'Неудачный или частично успешный'}
                    </h4>
                    <p>{importResult.message}</p>
                    {importResult.summary && (
                        <div>
                            <p>Общее количество строк, обработанных в формате CSV (после пропуска пустых): {importResult.summary.totalRowsProcessed ?? (importResult.summary.imported || 0) + (importResult.summary.failedValidation || 0) + (importResult.summary.failedOnSave || 0)}</p>
                            <p>Успешно импортированно: {importResult.summary.imported || 0}</p>
                            {importResult.summary.failedValidation > 0 && <p>Строки с ошибками проверки (не импортированные): {importResult.summary.failedValidation}</p>}
                            {importResult.summary.failedOnSave > 0 && <p>Строки, которые прошли проверку, но не были сохранены в базе данных: {importResult.summary.failedOnSave}</p>}
                        </div>
                    )}
                    {/* Отображаем ошибки валидации */}
                    {importResult.validationErrors && renderErrors(importResult.validationErrors)}
                    {/* Отображаем ошибки сохранения */}
                    {importResult.errorsOnSave && renderErrors(importResult.errorsOnSave)}
                    {/* Общие ошибки парсинга или другие */}
                    {importResult.errors && !importResult.validationErrors && !importResult.errorsOnSave && renderErrors(importResult.errors)}
                </div>
            )}
        </div>
    );
};

export default ImportPage;