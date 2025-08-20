import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { ValidationError } from '../../../shared/types';

@Injectable()
export class PasswordService {
  private readonly bcryptRounds: number;

  constructor(private readonly configService: ConfigService) {
    this.bcryptRounds = this.configService.get<number>('security.bcryptRounds', 12);
  }

  /**
   * 密码强度验证
   */
  validatePasswordStrength(password: string): void {
    const minLength = 8;
    const maxLength = 128;
    
    // 长度检查
    if (password.length < minLength) {
      throw new ValidationError(`Password must be at least ${minLength} characters long`, 'password');
    }
    
    if (password.length > maxLength) {
      throw new ValidationError(`Password must not exceed ${maxLength} characters`, 'password');
    }

    // 复杂度检查
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const complexityChecks = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar];
    const passedChecks = complexityChecks.filter(Boolean).length;

    if (passedChecks < 3) {
      throw new ValidationError(
        'Password must contain at least 3 of the following: uppercase letter, lowercase letter, number, special character',
        'password'
      );
    }

    // 常见密码检查
    const commonPasswords = [
      'password', 'password123', '123456', 'qwerty', 'abc123', 
      'admin', 'root', 'user', 'guest', 'welcome', 'letmein'
    ];
    
    if (commonPasswords.includes(password.toLowerCase())) {
      throw new ValidationError('Password is too common. Please choose a more secure password', 'password');
    }

    // 连续字符检查
    if (this.hasSequentialChars(password, 3)) {
      throw new ValidationError('Password should not contain 3 or more sequential characters', 'password');
    }

    // 重复字符检查
    if (this.hasRepeatingChars(password, 3)) {
      throw new ValidationError('Password should not contain 3 or more repeating characters', 'password');
    }
  }

  /**
   * 密码加密
   */
  async hashPassword(password: string): Promise<string> {
    try {
      const salt = await bcrypt.genSalt(this.bcryptRounds);
      return await bcrypt.hash(password, salt);
    } catch (error) {
      throw new Error('Failed to hash password');
    }
  }

  /**
   * 密码验证
   */
  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      return false;
    }
  }

  /**
   * 生成随机密码
   */
  generateRandomPassword(length: number = 16): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = uppercase + lowercase + numbers + symbols;
    let password = '';
    
    // 确保至少包含每种类型的字符
    password += this.getRandomChar(uppercase);
    password += this.getRandomChar(lowercase);
    password += this.getRandomChar(numbers);
    password += this.getRandomChar(symbols);
    
    // 填充剩余长度
    for (let i = 4; i < length; i++) {
      password += this.getRandomChar(allChars);
    }
    
    // 打乱字符顺序
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * 密码强度评分 (0-100)
   */
  calculatePasswordStrength(password: string): number {
    let score = 0;
    
    // 长度评分 (最多30分)
    if (password.length >= 8) score += 10;
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;
    
    // 字符类型评分 (最多40分)
    if (/[a-z]/.test(password)) score += 10;
    if (/[A-Z]/.test(password)) score += 10;
    if (/\d/.test(password)) score += 10;
    if (/[^a-zA-Z0-9]/.test(password)) score += 10;
    
    // 多样性评分 (最多20分)
    const uniqueChars = new Set(password).size;
    score += Math.min(20, uniqueChars * 2);
    
    // 模式扣分
    if (this.hasSequentialChars(password, 3)) score -= 10;
    if (this.hasRepeatingChars(password, 3)) score -= 10;
    if (this.isCommonPassword(password)) score -= 20;
    
    // 奖励分 (最多10分)
    if (password.length >= 20) score += 5;
    if (uniqueChars >= password.length * 0.8) score += 5; // 高字符多样性
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * 获取密码强度描述
   */
  getPasswordStrengthDescription(score: number): string {
    if (score >= 80) return 'Very Strong';
    if (score >= 60) return 'Strong';
    if (score >= 40) return 'Medium';
    if (score >= 20) return 'Weak';
    return 'Very Weak';
  }

  /**
   * 检查是否存在连续字符
   */
  private hasSequentialChars(password: string, minLength: number): boolean {
    const sequences = [
      'abcdefghijklmnopqrstuvwxyz',
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      '0123456789',
      'qwertyuiop',
      'asdfghjkl',
      'zxcvbnm'
    ];
    
    for (const sequence of sequences) {
      for (let i = 0; i <= sequence.length - minLength; i++) {
        const substr = sequence.substring(i, i + minLength);
        const reverseSubstr = substr.split('').reverse().join('');
        
        if (password.toLowerCase().includes(substr.toLowerCase()) || 
            password.toLowerCase().includes(reverseSubstr.toLowerCase())) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * 检查是否存在重复字符
   */
  private hasRepeatingChars(password: string, minLength: number): boolean {
    for (let i = 0; i <= password.length - minLength; i++) {
      const char = password[i];
      let count = 1;
      
      for (let j = i + 1; j < password.length && password[j] === char; j++) {
        count++;
        if (count >= minLength) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * 检查是否为常见密码
   */
  private isCommonPassword(password: string): boolean {
    const commonPasswords = [
      'password', 'password123', '123456', '123456789', 'qwerty', 
      'abc123', 'password1', 'admin', 'root', 'user', 'guest', 
      'welcome', 'letmein', 'monkey', 'dragon', 'sunshine', 
      'princess', 'football', 'baseball', 'freedom', 'whatever',
      'trustno1', 'master', 'hello', 'access', 'shadow'
    ];
    
    return commonPasswords.includes(password.toLowerCase());
  }

  /**
   * 获取随机字符
   */
  private getRandomChar(charset: string): string {
    return charset.charAt(Math.floor(Math.random() * charset.length));
  }

  /**
   * 检查密码是否曾被泄露（可选功能，需要集成HaveIBeenPwned API）
   */
  async checkPasswordBreach(password: string): Promise<boolean> {
    try {
      // 这里可以集成 HaveIBeenPwned API 检查密码是否在已知泄露中
      // 出于演示目的，这里返回false
      return false;
    } catch (error) {
      // 如果检查服务不可用，不阻止用户使用
      return false;
    }
  }

  /**
   * 密码策略配置
   */
  getPasswordPolicy() {
    return {
      minLength: 8,
      maxLength: 128,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      minComplexityTypes: 3,
      preventCommonPasswords: true,
      preventSequentialChars: true,
      preventRepeatingChars: true,
      maxSequentialLength: 3,
      maxRepeatingLength: 3
    };
  }
}
