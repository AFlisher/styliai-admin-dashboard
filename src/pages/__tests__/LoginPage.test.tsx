// SEC-15.2: the login form's second-factor step.
//
// The behaviours worth pinning are the ones a user would notice going wrong:
// the code field must not appear for accounts that don't use MFA, it must
// appear once the backend asks for it, the password must not have to be
// retyped, and a rejected code must not linger in the field.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from '../../contexts/AuthContext';
import { LoginPage } from '../LoginPage';
import { apiService, ApiError } from '../../services/api';

vi.mock('../../services/api', async () => {
  const actual = await vi.importActual<typeof import('../../services/api')>('../../services/api');
  return {
    ...actual,
    apiService: { login: vi.fn() },
    setupAuthInterceptor: vi.fn(),
  };
});

const mockLogin = apiService.login as unknown as ReturnType<typeof vi.fn>;

// vitest runs without `globals`, so RTL's automatic afterEach cleanup never
// registers and renders would accumulate across tests. Same convention as the
// other suites in this repo.
afterEach(cleanup);

const SUCCESS = {
  accessToken: 'token-123',
  user: { id: 'admin-1', email: 'admin@example.com', fullName: 'Admin', role: 'admin' },
};

function renderLogin() {
  return render(
    <AuthProvider>
      <LoginPage />
    </AuthProvider>
  );
}

async function fillCredentials(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/email/i), 'admin@example.com');
  await user.type(screen.getByLabelText(/^password$/i), 'hunter2');
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('accounts without MFA', () => {
  it('logs in with no code field ever shown', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue(SUCCESS);
    renderLogin();

    await fillCredentials(user);
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(mockLogin).toHaveBeenCalledTimes(1));
    // Third argument omitted entirely - nothing extra is sent for accounts
    // that don't use MFA.
    expect(mockLogin).toHaveBeenCalledWith('admin@example.com', 'hunter2', undefined);
    expect(screen.queryByLabelText(/authentication code/i)).not.toBeInTheDocument();
  });
});

describe('accounts with MFA', () => {
  it('reveals the code field when the backend answers MFA_REQUIRED', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValueOnce(new ApiError('Enter the code.', 'MFA_REQUIRED'));
    renderLogin();

    await fillCredentials(user);
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByLabelText(/authentication code/i)).toBeInTheDocument();
  });

  it('does not show MFA_REQUIRED as an error - it is a prompt, not a failure', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValueOnce(new ApiError('Enter the code.', 'MFA_REQUIRED'));
    renderLogin();

    await fillCredentials(user);
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await screen.findByLabelText(/authentication code/i);
    expect(screen.queryByText(/login failed/i)).not.toBeInTheDocument();
  });

  it('submits the code with the credentials, without retyping the password', async () => {
    const user = userEvent.setup();
    mockLogin
      .mockRejectedValueOnce(new ApiError('Enter the code.', 'MFA_REQUIRED'))
      .mockResolvedValueOnce(SUCCESS);
    renderLogin();

    await fillCredentials(user);
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await user.type(await screen.findByLabelText(/authentication code/i), '123456');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(mockLogin).toHaveBeenCalledTimes(2));
    expect(mockLogin).toHaveBeenLastCalledWith('admin@example.com', 'hunter2', {
      totpCode: '123456',
    });
    expect(localStorage.getItem('styli_access_token')).toBe('token-123');
  });

  it('keeps the field open and clears it after a rejected code', async () => {
    const user = userEvent.setup();
    mockLogin
      .mockRejectedValueOnce(new ApiError('Enter the code.', 'MFA_REQUIRED'))
      .mockRejectedValueOnce(new ApiError('That code is not valid.', 'MFA_INVALID'));
    renderLogin();

    await fillCredentials(user);
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    const field = await screen.findByLabelText(/authentication code/i);
    await user.type(field, '000000');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await screen.findByText(/that code is not valid/i);
    // Still open so the code can be retyped, but emptied so a stale value is
    // never resubmitted.
    expect(screen.getByLabelText(/authentication code/i)).toHaveValue('');
  });

  it('sends a recovery code under the recoveryCode field, not totpCode', async () => {
    const user = userEvent.setup();
    mockLogin
      .mockRejectedValueOnce(new ApiError('Enter the code.', 'MFA_REQUIRED'))
      .mockResolvedValueOnce(SUCCESS);
    renderLogin();

    await fillCredentials(user);
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await screen.findByLabelText(/authentication code/i);
    await user.click(screen.getByRole('button', { name: /recovery code/i }));

    await user.type(await screen.findByLabelText(/recovery code/i), 'ABCDEFGH-23456722');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(mockLogin).toHaveBeenCalledTimes(2));
    expect(mockLogin).toHaveBeenLastCalledWith('admin@example.com', 'hunter2', {
      recoveryCode: 'ABCDEFGH-23456722',
    });
  });

  it('does not submit a whitespace-only code', async () => {
    // `required` on the input covers the empty case natively; whitespace-only
    // satisfies `required` and is what the explicit guard is actually for.
    const user = userEvent.setup();
    mockLogin.mockRejectedValueOnce(new ApiError('Enter the code.', 'MFA_REQUIRED'));
    renderLogin();

    await fillCredentials(user);
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await user.type(await screen.findByLabelText(/authentication code/i), '   ');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // Still one call: the blank second attempt never reached the network.
    await waitFor(() => expect(mockLogin).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/enter your 6-digit code/i)).toBeInTheDocument();
  });
});

describe('credential handling', () => {
  it('shows a real error for bad credentials and asks for no code', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValue(new ApiError('Invalid email or password.', undefined));
    renderLogin();

    await fillCredentials(user);
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
    // A wrong password must never reveal whether the account uses MFA.
    expect(screen.queryByLabelText(/authentication code/i)).not.toBeInTheDocument();
  });
});
