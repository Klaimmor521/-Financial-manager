import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Login } from '../components/Login';
import { BrowserRouter } from 'react-router-dom';
import { authService } from '../services/authService';

// Mock the auth service
jest.mock('../services/authService', () => ({
  authService: {
    login: jest.fn()
  }
}));

// ESLint жаловался на пропсы
// Mock useNavigate
const mockedNavigate = jest.fn();
const MockBrowserRouter = ({ children }) => <div>{children}</div>;
MockBrowserRouter.propTypes = 
{
  children: PropTypes.node,
};
jest.mock('react-router-dom', () => ({
  BrowserRouter: MockBrowserRouter,
  useNavigate: () => mockedNavigate
}));

describe('Login Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders login form', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );
    
    expect(screen.getByText(/Вход/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Пароль/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Войти/i })).toBeInTheDocument();
  });

  test('handles input changes', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );
    
    const emailInput = screen.getByPlaceholderText(/Email/i);
    const passwordInput = screen.getByPlaceholderText(/Пароль/i);
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    expect(emailInput.value).toBe('test@example.com');
    expect(passwordInput.value).toBe('password123');
  });

  test('submits form and redirects on successful login', async () => {
    authService.login.mockResolvedValueOnce({ username: 'testuser' });
    
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );
    
    const emailInput = screen.getByPlaceholderText(/Email/i);
    const passwordInput = screen.getByPlaceholderText(/Пароль/i);
    const submitButton = screen.getByRole('button', { name: /Войти/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(mockedNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  test('displays error message on login failure', async () => {
    authService.login.mockRejectedValueOnce(new Error('Invalid credentials'));
    
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );
    
    const emailInput = screen.getByPlaceholderText(/Email/i);
    const passwordInput = screen.getByPlaceholderText(/Пароль/i);
    const submitButton = screen.getByRole('button', { name: /Войти/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Ошибка входа/i)).toBeInTheDocument();
    });
  });
});