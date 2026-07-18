'use client';

import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { passwordStrength } from '@/lib/password';

interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Shows the 3-segment strength meter under the field (new passwords) */
  showStrength?: boolean;
}

const STRENGTH_LABELS = ['', 'Trop faible', 'Correct', 'Solide'];
const STRENGTH_COLORS = ['', 'bg-red-500', 'bg-yellow-500', 'bg-green-600'];

/** Password field with a show/hide toggle and optional strength meter */
export function PasswordInput({
  showStrength = false,
  className,
  value,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = React.useState(false);
  const strength = showStrength ? passwordStrength(String(value ?? '')) : 0;

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Input
          type={visible ? 'text' : 'password'}
          className={cn('pr-10', className)}
          value={value}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label={
            visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
          }
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {showStrength && String(value ?? '').length > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex flex-1 gap-1">
            {[1, 2, 3].map((level) => (
              <div
                key={level}
                className={cn(
                  'h-1.5 flex-1 rounded-full bg-muted',
                  strength >= level && STRENGTH_COLORS[strength]
                )}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground w-16 text-right">
            {STRENGTH_LABELS[strength]}
          </span>
        </div>
      )}
    </div>
  );
}
