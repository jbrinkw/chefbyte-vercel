import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleDemo = async () => {
    setError(null);
    setLoading(true);
    const demoEmail = 'demo2@chefbyte.test';
    const demoPass = 'DemoPassword123!';

    try {
      // 1. Try Login
      const { error } = await signIn(demoEmail, demoPass);

      // 2. If login fails, Try Signup
      if (error) {
        console.log('Demo login failed, trying signup...');
        const res = await signUp(demoEmail, demoPass);
        if (res.error) throw res.error;

        const loginRes = await signIn(demoEmail, demoPass);
        if (loginRes.error) throw loginRes.error;
      }

      // 3. Reset Data
      console.log('Demo login success, preparing to reset data...');
      const { getAuthHeader } = await import('../lib/api-supabase');
      const headers = await getAuthHeader();
      console.log('Auth headers obtained:', headers);

      console.log('Calling Supabase RPC demo_reset...');
      const { supabase } = await import('../lib/supabase');
      const { error: resetError } = await supabase.rpc('demo_reset');
      if (resetError) {
        console.error('Reset failed with error:', resetError);
        // Allow login to continue even if reset RPC is not present
      } else {
        console.log('Reset successful');
      }

      navigate('/');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="authPage">
      <div className="authCard">
        <h1>ChefByte</h1>
        <h2>Sign In</h2>

        {error && <div className="authError">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="formGroup">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="formGroup">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="authButton" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <button
            type="button"
            className="authButton demoButton"
            disabled={loading}
            onClick={handleDemo}
            style={{ marginTop: '10px', backgroundColor: '#28a745' }}
          >
            Try Demo
          </button>
        </form>

        <p className="authLink">
          Don't have an account? <Link to="/signup">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}
