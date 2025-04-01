import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Register } from '../components/Register';
import { authService } from '../services/authService';

// Mock the auth service
jest.mock('../services/authService', () => ({
  authService: {
    register: jest.fn()
  }
}));

// Mock useNavigate
const mockedNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }) => <div>{children}</div>,
  useNavigate: () => mockedNavigate
}));

describe('Register Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders registration form', () => {
    render(
      <BrowserRouter>
        <Register />
      </BrowserRouter>
    );
    
    expect(screen.getByText(/Регистрация/i)).toBeInTheDocument();
    // Используем getByPlaceholderText вместо getByLabelText
    expect(screen.getByPlaceholderText(/Имя пользователя/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Пароль/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Зарегистрироваться/i })).toBeInTheDocument();
  });

  test('handles input changes', () => {
    render(
      <BrowserRouter>
        <Register />
      </BrowserRouter>
    );
    
    // Используем getByPlaceholderText вместо getByLabelText
    const usernameInput = screen.getByPlaceholderText(/Имя пользователя/i);
    const emailInput = screen.getByPlaceholderText(/Email/i);
    const passwordInput = screen.getByPlaceholderText(/Пароль/i);
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    expect(usernameInput.value).toBe('testuser');
    expect(emailInput.value).toBe('test@example.com');
    expect(passwordInput.value).toBe('password123');
  });

  test('submits form and redirects on successful registration', async () => {
    authService.register.mockResolvedValueOnce({});
    
    render(
      <BrowserRouter>
        <Register />
      </BrowserRouter>
    );
    
    // Используем getByPlaceholderText вместо getByLabelText
    const usernameInput = screen.getByPlaceholderText(/Имя пользователя/i);
    const emailInput = screen.getByPlaceholderText(/Email/i);
    const passwordInput = screen.getByPlaceholderText(/Пароль/i);
    const submitButton = screen.getByRole('button', { name: /Зарегистрироваться/i });
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(authService.register).toHaveBeenCalledWith('testuser', 'test@example.com', 'password123');
      // eslint-disable-next-line testing-library/no-wait-for-multiple-assertions
      expect(mockedNavigate).toHaveBeenCalledWith('/login');
    });
  });

  test('displays error message on registration failure', async () => {
    authService.register.mockRejectedValueOnce(new Error('Email already in use'));
    
    render(
      <BrowserRouter>
        <Register />
      </BrowserRouter>
    );
    
    // Используем getByPlaceholderText вместо getByLabelText
    const usernameInput = screen.getByPlaceholderText(/Имя пользователя/i);
    const emailInput = screen.getByPlaceholderText(/Email/i);
    const passwordInput = screen.getByPlaceholderText(/Пароль/i);
    const submitButton = screen.getByRole('button', { name: /Зарегистрироваться/i });
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'existing@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Ошибка регистрации/i)).toBeInTheDocument();
    });
  });
});