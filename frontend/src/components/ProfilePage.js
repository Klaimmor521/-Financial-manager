import React, { useState, useEffect, useCallback } from 'react'; // Добавлен useCallback
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const ProfilePage = () => {
    const navigate = useNavigate();
    const [profileData, setProfileData] = useState(null);
    const [editProfile, setEditProfile] = useState(false);
    // Инициализируем updatedProfile пустым объектом или значениями из profileData, когда они загрузятся
    const [updatedProfile, setUpdatedProfile] = useState({ username: '', email: '', avatar_url: '' });
    const [isLoading, setIsLoading] = useState(true); // Состояние загрузки
    const [error, setError] = useState(null);

    // Используем useCallback для fetchProfileData, чтобы не создавать функцию заново при каждом рендере
    const fetchProfileData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            console.log('Sending request to http://localhost:5000/api/users/profile');
            // URL теперь относительный благодаря proxy (или полный, если proxy не настроен)
            const response = await axios.get('http://localhost:5000/api/users/profile', { // ИЛИ 'http://localhost:5000/api/users/profile'
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            console.log("Response from server:", response.data);
            setProfileData(response.data);
            // Устанавливаем начальные значения для формы редактирования
            setUpdatedProfile({
                username: response.data.username || '',
                email: response.data.email || '',
                avatar_url: response.data.avatar_url || '' // Поле для аватара
            });
        } catch (err) { // Изменил error на err, чтобы не конфликтовать с состоянием error
            console.error("Error fetching profile:", err);
            setError("Failed to fetch profile. Please try again later.");
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

    const handleSaveProfile = async () => {
        setError(null);
        try {
            // Убираем поля, которые не должны отправляться или если они пустые и не обязательны
            const dataToSend = { ...updatedProfile };
            if (!dataToSend.avatar_url) delete dataToSend.avatar_url; // Если пусто, не отправляем

            const response = await axios.put('http://localhost:5000/api/users/profile', dataToSend, { // ИЛИ 'http://localhost:5000/api/users/profile'
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            setProfileData(prevData => ({...prevData, ...response.data})); // Обновляем только полученные поля
            setUpdatedProfile(prevValues => ({...prevValues, ...response.data})); // И форму тоже
            setEditProfile(false);
            toast.success('Profile updated successfully!');
        } catch (err) {
            console.error("Error updating profile:", err);
            const errorMessage = err.response?.data?.error || "Failed to update profile. Please try again later.";
            setError(errorMessage);
            toast.error(errorMessage);
        }
    };

    const handleDeleteAccount = async () => {
        if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
            setError(null);
            try {
                await axios.delete('http://localhost:5000/api/users/profile', { // ИЛИ 'http://localhost:5000/api/users/profile'
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                });
                localStorage.removeItem('token');
                toast.success('Account deleted successfully!');
                navigate('/login'); // Или на страницу регистрации
            } catch (err) {
                console.error("Error deleting account:", err);
                const errorMessage = err.response?.data?.error || "Failed to delete account. Please try again later.";
                setError(errorMessage);
                toast.error(errorMessage);
            }
        }
    };

    if (isLoading) {
        return <div>Loading profile...</div>;
    }

    if (!profileData && !isLoading) { // Если загрузка завершена, но данных нет (например, из-за ошибки)
        return <div>Error loading profile. {error || "Please try refreshing the page."}</div>;
    }
    
    // Если profileData все еще null после загрузки (маловероятно, если fetchProfileData отработал)
    if (!profileData) return <div>No profile data available.</div>;


    return (
        <div className="profile-container"> {/* Используй классы из CSS */}
            <h2>Profile</h2>
            {error && <div className="alert alert-danger">{error}</div>}

            {editProfile ? (
                <div className="edit-profile-form"> {/* Используй классы из CSS */}
                    <div>
                        <label htmlFor="username">Username:</label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            value={updatedProfile.username}
                            onChange={handleInputChange}
                        />
                    </div>
                    <div>
                        <label htmlFor="email">Email:</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={updatedProfile.email}
                            onChange={handleInputChange}
                        />
                    </div>
                    <div>
                        <label htmlFor="avatar_url">Avatar URL (optional):</label>
                        <input
                            type="text"
                            id="avatar_url"
                            name="avatar_url"
                            placeholder="http://example.com/avatar.png"
                            value={updatedProfile.avatar_url || ''} // Убедимся, что value не undefined
                            onChange={handleInputChange}
                        />
                    </div>
                    <button onClick={handleSaveProfile}>Save</button>
                    <button onClick={() => {
                        setEditProfile(false);
                        // Сбрасываем изменения в форме к текущим данным профиля
                        setUpdatedProfile({
                            username: profileData.username,
                            email: profileData.email,
                            avatar_url: profileData.avatar_url || ''
                        });
                        setError(null); // Сбрасываем ошибку при отмене
                    }}>Cancel</button>
                </div>
            ) : (
                <div className="profile-details"> {/* Используй классы из CSS */}
                    {profileData.avatar_url && (
                        <img 
                            src={profileData.avatar_url} 
                            alt={`${profileData.username}'s avatar`}
                            style={{width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', marginBottom: '15px'}}
                        />
                    )}
                    <p><strong>Username:</strong> {profileData.username}</p>
                    <p><strong>Email:</strong> {profileData.email}</p>
                    <p><strong>Joined:</strong> {new Date(profileData.created_at).toLocaleDateString()}</p> {/* Используй toLocaleDateString или toLocaleString */}
                    
                    <p><strong>Goal Count:</strong> {profileData.goalCount !== undefined ? profileData.goalCount : 'N/A'}</p>
                    <p><strong>Total Income:</strong> {profileData.incomeSum !== undefined ? profileData.incomeSum.toFixed(2) : 'N/A'}</p>
                    <p><strong>Total Expense:</strong> {profileData.expenseSum !== undefined ? profileData.expenseSum.toFixed(2) : 'N/A'}</p>

                    <button onClick={() => setEditProfile(true)}>Edit Profile</button>
                    <button onClick={handleDeleteAccount} className="btn btn-danger" style={{marginLeft: '10px'}}>
                        Delete Account
                    </button>
                </div>
            )}
        </div>
    );
};

export default ProfilePage;