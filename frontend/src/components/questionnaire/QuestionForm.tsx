'use client';

import { useState } from 'react';
import { Question, QuestionGroup } from '@/types';
import { Input } from '@/components/ui/input';
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
            <Input
              id={question.id}
              type="text"
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

      case 'boolean':
        return (
          <div key={question.id} className="flex items-start space-x-3 space-y-0">
            <Checkbox
              id={question.id}
              checked={(value as boolean) || false}
              onCheckedChange={(checked) => onChange(question.id, checked as boolean)}
            />
            <div className="space-y-1 leading-none">
              <Label htmlFor={question.id} className="cursor-pointer">
                {question.text}
                {question.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {question.helpText && (
                <p className="text-xs text-muted-foreground">{question.helpText}</p>
              )}
            </div>
          </div>
        );

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
