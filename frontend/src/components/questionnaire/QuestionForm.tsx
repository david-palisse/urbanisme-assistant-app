'use client';

import { useState } from 'react';
import { Question, QuestionGroup } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { HelpCircle } from 'lucide-react';

interface QuestionFormProps {
  groups: QuestionGroup[];
  responses: Record<string, string | number | boolean | string[]>;
  onChange: (questionId: string, value: string | number | boolean | string[]) => void;
}

export function QuestionForm({ groups, responses, onChange }: QuestionFormProps) {
  const shouldShowQuestion = (question: Question): boolean => {
    if (!question.dependsOn) return true;
    const dependentValue = responses[question.dependsOn.questionId];
    return dependentValue === question.dependsOn.value;
  };

  const renderQuestion = (question: Question) => {
    if (!shouldShowQuestion(question)) return null;

    const value = responses[question.id];

    switch (question.type) {
      case 'text':
        return (
          <div key={question.id} className="space-y-2">
            <Label htmlFor={question.id}>
              {question.text}
              {question.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Textarea
              id={question.id}
              rows={3}
              value={(value as string) || ''}
              onChange={(e) => onChange(question.id, e.target.value)}
              placeholder={question.helpText}
            />
            {question.helpText && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <HelpCircle className="h-3 w-3" />
                {question.helpText}
              </p>
            )}
          </div>
        );

      case 'number':
        return (
          <div key={question.id} className="space-y-2">
            <Label htmlFor={question.id}>
              {question.text}
              {question.required && <span className="text-destructive ml-1">*</span>}
              {question.unit && (
                <span className="text-muted-foreground ml-1">({question.unit})</span>
              )}
            </Label>
            <Input
              id={question.id}
              type="number"
              value={(value as number) ?? ''}
              onChange={(e) =>
                onChange(question.id, e.target.value ? parseFloat(e.target.value) : '')
              }
              min={question.validation?.min}
              max={question.validation?.max}
              placeholder={question.helpText}
            />
            {question.helpText && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <HelpCircle className="h-3 w-3" />
                {question.helpText}
              </p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={question.id} className="space-y-2">
            <Label htmlFor={question.id}>
              {question.text}
              {question.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Select
              value={(value as string) || ''}
              onValueChange={(val) => onChange(question.id, val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez une option" />
              </SelectTrigger>
              <SelectContent>
                {question.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {question.helpText && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <HelpCircle className="h-3 w-3" />
                {question.helpText}
              </p>
            )}
          </div>
        );

      case 'boolean': {
        // Explicit yes/no choice: an untouched question stays unanswered
        // (undefined), instead of an unchecked checkbox being ambiguous
        // between "no" and "not answered yet".
        const boolValue = typeof value === 'boolean' ? value : undefined;
        return (
          <div key={question.id} className="space-y-2">
            <Label>
              {question.text}
              {question.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={boolValue === true ? 'default' : 'outline'}
                onClick={() => onChange(question.id, true)}
              >
                Oui
              </Button>
              <Button
                type="button"
                variant={boolValue === false ? 'default' : 'outline'}
                onClick={() => onChange(question.id, false)}
              >
                Non
              </Button>
            </div>
            {question.helpText && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <HelpCircle className="h-3 w-3" />
                {question.helpText}
              </p>
            )}
          </div>
        );
      }

      case 'multiselect':
        const selectedValues = (value as string[]) || [];
        return (
          <div key={question.id} className="space-y-3">
            <Label>
              {question.text}
              {question.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <div className="space-y-2">
              {question.options?.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${question.id}-${option.value}`}
                    checked={selectedValues.includes(option.value)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        onChange(question.id, [...selectedValues, option.value]);
                      } else {
                        onChange(
                          question.id,
                          selectedValues.filter((v) => v !== option.value)
                        );
                      }
                    }}
                  />
                  <Label
                    htmlFor={`${question.id}-${option.value}`}
                    className="cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
            {question.helpText && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <HelpCircle className="h-3 w-3" />
                {question.helpText}
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const visibleQuestions = group.questions.filter(shouldShowQuestion);
        if (visibleQuestions.length === 0) return null;

        return (
          <Card key={group.id}>
            <CardHeader>
              <CardTitle className="text-lg">{group.title}</CardTitle>
              {group.description && (
                <CardDescription>{group.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {group.questions.map(renderQuestion)}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
