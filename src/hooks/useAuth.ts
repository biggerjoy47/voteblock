import { useState, useEffect, createContext, useContext } from 'react';
import { User } from '../types';
import { StorageService } from '../services/storageService';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useAuthProvider = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const currentUser = await StorageService.getItem('currentUser');
      if (currentUser) {
        setUser(currentUser);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Check if admin account exists, create default if not
      let users = await StorageService.getAllFromStore('users');
      if (users.length === 0) {
        const defaultAdmin: User = {
          id: crypto.randomUUID(),
          email: 'admin@inec.gov.ng',
          role: 'admin',
          name: 'System Administrator',
          createdAt: new Date()
        };
        await StorageService.addToStore('users', defaultAdmin);
        users = [defaultAdmin];
      }

      // Simple authentication (in production, this would be properly secured)
      const foundUser = users.find(u => u.email === email);
      if (foundUser && (password === 'admin123' || password === 'password')) {
        setUser(foundUser);
        await StorageService.setItem('currentUser', foundUser);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error during login:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setUser(null);
    await StorageService.setItem('currentUser', null);
  };

  return {
    user,
    login,
    logout,
    isLoading
  };
};

export { AuthContext };