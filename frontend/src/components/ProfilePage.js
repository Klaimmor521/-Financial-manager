import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const ProfilePage = () => {
    const navigate = useNavigate();
    const [profileData, setProfileData] = useState(null);
    const [editProfile, setEditProfile] = useState(false);
    const [updatedProfile, setUpdatedProfile] = useState({ username: '', email: '', avatar: '' });
    const [isLoading, setIsLoading] = useState(true); // Состояние загрузки
    const [error, setError] = useState(null);
    const [formErrors, setFormErrors] = useState({});
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const fileInputRef = useRef(null);

    const API_BASE_URL = `http://localhost:5000`;

    // ProfilePage.js

    const validateProfileForm = () => {
        const errors = {};
        if (!updatedProfile.username.trim()) {
            errors.username = "Имя пользователя обязательно для заполнения.";
        } else if (updatedProfile.username.length < 3) {
            errors.username = "Имя пользователя должно содержать не менее 3 символов.";
        }
        // Простая проверка формата email
        if (!updatedProfile.email.trim()) {
            errors.email = "Email обязателен для заполнения.";
        } else if (!/\S+@\S+\.\S+/.test(updatedProfile.email)) {
            errors.email = "Некорректный формат email.";
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0; // true если нет ошибок
    };

    // Используем useCallback для fetchProfileData, чтобы не создавать функцию заново при каждом рендере
    const fetchProfileData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/users/profile`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            console.log("Response from server:", response.data);
            setProfileData(response.data);
            setUpdatedProfile({
                username: response.data.username || '',
                email: response.data.email || '',
            });
            if (response.data.avatar) {
                setAvatarPreview(`${API_BASE_URL}${response.data.avatar}`);
            } else {
                setAvatarPreview(null); // Если аватара нет
            }
        } catch (err) {
            console.error("Error fetching profile:", err);
            setError("Не удалось получить доступ к профилю. Пожалуйста, повторите попытку позже.");
            toast.error("Failed to fetch profile data.");
            if (err.response && err.response.status === 401) {
                localStorage.removeItem('token');
                navigate('/login');
            }
        } finally {
            setIsLoading(false);
        }
    }, [navigate]); // navigate как зависимость

    useEffect(() => {
        fetchProfileData();
    }, [fetchProfileData]); // Вызываем fetchProfileData при монтировании

    // Для отладки состояния profileData
    // useEffect(() => {
    //   if (profileData) {
    //     console.log("Profile Data in state:", profileData);
    //   }
    // }, [profileData]);

    const handleInputChange = (e) => {
        setUpdatedProfile({ ...updatedProfile, [e.target.name]: e.target.value });
    };

    const handleAvatarFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // setAvatarFile(file); // Это состояние может быть уже не так нужно, если мы сразу отправляем. Но для превью полезно.
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result); // Показываем локальное превью нового файла немедленно
            };
            reader.readAsDataURL(file);

            // СРАЗУ ВЫЗЫВАЕМ ЗАГРУЗКУ НА СЕРВЕР ПОСЛЕ ВЫБОРА ФАЙЛА
            handleSaveAvatar(file);
        }
    };

    const handleSaveAvatar = async (fileToUpload) => {
        if (!fileToUpload) {
            console.log("handleSaveAvatar called without a file.");
            return;
        }
        setError(null);
        const formData = new FormData();
        formData.append('avatar', fileToUpload);

        // Важно: чтобы бэкенд мог корректно обновить запись, ему могут понадобиться
        // текущие username и email, даже если меняется только аватар.
        // Это также помогает, если бэкенд ожидает эти поля для валидации или других операций.
        if (profileData) {
            formData.append('username', profileData.username);
            formData.append('email', profileData.email);
        } else {
            // Если profileData еще не загружен, это может быть проблемой.
            // Можно либо прервать, либо попытаться загрузить без этих данных (если бэкенд это поддерживает)
            console.warn("Profile data not available when uploading avatar. Sending avatar only.");
            // Если бэкенд может обновить аватар только по ID пользователя (из токена),
            // и не требует username/email в этом конкретном случае, то это может сработать.
            // Но лучше убедиться, что profileData загружен.
            // Для надежности, можно дождаться загрузки profileData или показать ошибку.
        }

        console.log("Sending avatar to server...", formData.get('avatar'));

        try {
            const response = await axios.put(`${API_BASE_URL}/api/users/profile`, formData, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'multipart/form-data',
                },
            });
            console.log('Server response after avatar upload:', response.data);

            const newAvatarUrlFromServer = response.data.avatar;
            // Обновляем profileData, чтобы оно было актуальным
            setProfileData(prevData => {
                const updated = { ...prevData, avatar: newAvatarUrlFromServer };
                console.log('Updating profileData to:', updated);
                return updated;
            });

            // Обновляем превью аватара с URL от сервера
            if (newAvatarUrlFromServer) {
                const fullPreviewUrl = `${API_BASE_URL}${newAvatarUrlFromServer}`;
                console.log('Setting avatarPreview (from server) to:', fullPreviewUrl);
                setAvatarPreview(fullPreviewUrl);
            } else {
                console.log('Setting avatarPreview to null (no avatar from server)');
                setAvatarPreview(null); // Если аватар был удален и сервер вернул null
            }
            // setAvatarFile(null); // Можно сбросить, так как файл уже отправлен
            toast.success('Avatar updated successfully!');
        } catch (err) {
            console.error("Error updating avatar:", err.response ? err.response.data : err.message);
            const errorMessage = err.response?.data?.error || "Не удалось обновить аватар.";
            setError(errorMessage);
            toast.error(errorMessage);

            // Важно: если загрузка не удалась, откатываем превью к предыдущему состоянию (если оно было)
            // или к локальному превью, если пользователь еще не ушел со страницы.
            // Лучше всего откатить к тому, что сейчас в profileData.avatar_url
            if (profileData && profileData.avatar) {
                setAvatarPreview(`${API_BASE_URL}${profileData.avatar}`);
            } else if (avatarFile) { // Если был выбран файл, но загрузка не удалась, показываем его локальное превью
                const reader = new FileReader();
                reader.onloadend = () => { setAvatarPreview(reader.result); };
                reader.readAsDataURL(avatarFile);
            }
            else {
                setAvatarPreview(null); // Или к заглушке
            }
        }
    };

    
    const handleSaveProfileDetails = async () => {
        setError(null); // Сбрасываем общую ошибку сервера
        setFormErrors({}); // Сбрасываем ошибки формы

        if (!validateProfileForm()) { // Вызываем валидацию
            return; // Если есть ошибки, не отправляем
        }

        try {
            const dataToSend = {
                username: updatedProfile.username,
                email: updatedProfile.email,
            };

            const response = await axios.put(`${API_BASE_URL}/api/users/profile`, dataToSend, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            setProfileData(prevData => ({ ...prevData, ...response.data }));
            // setUpdatedProfile(prevValues => ({ ...prevValues, ...response.data })); // Обновится из profileData при след. открытии формы
            setEditProfile(false);
            toast.success('Данные профиля успешно обновлены!');
        } catch (err) {
            console.error("Error updating profile details:", err);
            // Обработка ошибок уникальности с бэкенда
            if (err.response && err.response.data && err.response.data.error) {
                const serverError = err.response.data.error;
                if (serverError.toLowerCase().includes('email already in use') || serverError.toLowerCase().includes('почта уже используется')) {
                    setFormErrors(prevErrors => ({ ...prevErrors, email: 'Эта электронная почта уже используется.' }));
                } else if (serverError.toLowerCase().includes('username already in use') || serverError.toLowerCase().includes('имя пользователя уже используется')) {
                    setFormErrors(prevErrors => ({ ...prevErrors, username: 'Это имя пользователя уже используется.' }));
                } else {
                    setError(serverError); // Общая ошибка сервера
                }
                toast.error(serverError);
            } else {
                const genericMessage = "Не удалось обновить профиль. Пожалуйста, повторите попытку позже.";
                setError(genericMessage);
                toast.error(genericMessage);
            }
        }
    };

    const handleDeleteAvatar = async () => {
        if (!profileData || !profileData.avatar) {
            toast.info("No avatar to delete.");
            return;
        }
        if (window.confirm("Вы уверены, что хотите удалить свой аватар?")) {
            setError(null);
            try {
                // Для удаления аватара отправляем запрос на обновление профиля
                // с пустым (или специальным значением) для avatar_url.
                // Бэкенд должен обработать это и удалить файл с сервера.
                const dataToSend = {
                    username: profileData.username,
                    email: profileData.email,
                    avatar: null // Или специальный флаг, например 'DELETE_AVATAR'
                };

                const response = await axios.put(`${API_BASE_URL}/api/users/profile`, dataToSend, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                });

                setProfileData(prevData => ({ ...prevData, avatar: null }));
                setAvatarPreview(null);
                toast.success('Avatar deleted successfully!');
            } catch (err) {
                console.error("Error deleting avatar:", err);
                const errorMessage = err.response?.data?.error || "Не удалось удалить аватар.";
                setError(errorMessage);
                toast.error(errorMessage);
            }
        }
    };

    const handleDeleteAccount = async () => {
        if (window.confirm("Вы уверены, что хотите удалить свою учетную запись? Это действие невозможно отменить.")) {
            setError(null);
            try {
                await axios.delete(`${API_BASE_URL}/api/users/profile`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                });
                localStorage.removeItem('token');
                toast.success('Account deleted successfully!');
                navigate('/login'); // Или на страницу регистрации
            } catch (err) {
                console.error("Error deleting account:", err);
                const errorMessage = err.response?.data?.error || "Не удалось удалить учетную запись. Пожалуйста, повторите попытку позже.";
                setError(errorMessage);
                toast.error(errorMessage);
            }
        }
    };

    if (isLoading) return <div>Загрузка профиля...</div>;
    if (!profileData && !isLoading) return <div>Ошибка при загрузке профиля.{error || "Пожалуйста, попробуйте обновить страницу."}</div>;
    if (!profileData) return <div>Данные профиля недоступны.</div>;

    return (
        <div className="profile-page-container"> {/* Общий контейнер для страницы */}
            <h2>Профиль</h2>
            {error && <div className="alert alert-danger">{error}</div>}

            {/* Секция Аватара - видна всегда */}
            <div className="avatar-section">
                <img
                    src={avatarPreview || 'https://via.placeholder.com/150?text=No+Avatar'} // Заглушка, если нет аватара
                    alt="Аватар"
                    className="profile-avatar-image"
                />
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }} // Скрываем стандартный input
                    accept="image/*"
                    onChange={handleAvatarFileChange} // Используем новую функцию
                />
                <div className="avatar-buttons">
                    <button 
                        className="btn btn-sm btn-outline-primary" 
                        onClick={() => fileInputRef.current.click()} // Триггерим клик по скрытому input
                    >
                        {profileData.avatar ? 'Сменить аватар' : 'Загрузить аватар'}
                    </button>
                    {profileData.avatar && (
                        <button 
                            className="btn btn-sm btn-outline-danger"
                            onClick={handleDeleteAvatar}
                        >
                            Удалить аватар
                        </button>
                    )}
                </div>
            </div>

            {/* Секция Редактирования Профиля (текстовые поля) */}
            {editProfile ? (
                <div className="edit-profile-form">
                    <div>
                        <label htmlFor="username">Имя пользователя:</label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            value={updatedProfile.username}
                            onChange={handleInputChange}
                        />
                        {formErrors.username && <p style={{ color: 'red', fontSize: '0.8em', marginTop: '5px' }}>{formErrors.username}</p>} {/* Отображение ошибки */}
                    </div>
                    <div>
                        <label htmlFor="email">Электронная почта:</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={updatedProfile.email}
                            onChange={handleInputChange}
                        />
                        {formErrors.email && <p style={{ color: 'red', fontSize: '0.8em', marginTop: '5px' }}>{formErrors.email}</p>} {/* Отображение ошибки */}
                    </div>
                    <button onClick={handleSaveProfileDetails}>Сохранить детали</button>
                    <button onClick={() => {
                        setEditProfile(false);
                        setUpdatedProfile({
                            username: profileData.username,
                            email: profileData.email,
                        });
                        // Восстанавливаем превью аватара из profileData при отмене редактирования деталей
                        if (profileData.avatar) {
                            setAvatarPreview(`${API_BASE_URL}${profileData.avatar}`);
                        } else {
                            setAvatarPreview(null);
                        }
                        setError(null);
                    }}>Cancel</button>
                </div>
            ) : (
                <div className="profile-details">
                    <p><strong>Имя пользователя:</strong> {profileData.username}</p>
                    <p><strong>Электронная почта:</strong> {profileData.email}</p>
                    <p><strong>Присоединился:</strong> {new Date(profileData.created_at).toLocaleDateString()}</p>
                    <p><strong>Количество целей:</strong> {profileData.goalCount ?? 'N/A'}</p>
                    <p><strong>Общий доход:</strong> {profileData.incomeSum?.toFixed(2) ?? 'N/A'}</p>
                    <p><strong>Общая сумма расходов:</strong> {profileData.expenseSum?.toFixed(2) ?? 'N/A'}</p>

                    <button onClick={() => setEditProfile(true)}>Редактировать профиль</button>
                    <button onClick={handleDeleteAccount} className="btn btn-danger" style={{ marginLeft: '10px' }}>
                    Удалить учетную запись
                    </button>
                </div>
            )}
        </div>
    );
};

export default ProfilePage;