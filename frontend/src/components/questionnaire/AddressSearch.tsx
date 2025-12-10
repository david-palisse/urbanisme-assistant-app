'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { AddressSuggestion } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { debounce } from '@/lib/utils';
import { Search, MapPin, Loader2 } from 'lucide-react';

interface AddressSearchProps {
  onSelect: (address: AddressSuggestion) => void;
  initialValue?: string;
}

export function AddressSearch({ onSelect, initialValue = '' }: AddressSearchProps) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const searchAddress = useCallback(
    debounce(async (searchQuery: string) => {
      if (searchQuery.length < 3) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const results = await api.searchAddress(searchQuery);
        setSuggestions(results);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Address search failed:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    []
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    searchAddress(value);
  };

  const handleSelect = (suggestion: AddressSuggestion) => {
    setQuery(suggestion.label);
    setShowSuggestions(false);
    onSelect(suggestion);
  };

  return (
    <div className="relative space-y-2">
      <Label htmlFor="address">Adresse du terrain</Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="address"
          type="text"
          placeholder="Ex: 12 rue des Lilas, 75020 Paris"
          value={query}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          className="pl-10"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <Card className="absolute z-50 w-full mt-1 max-h-64 overflow-auto">
          <CardContent className="p-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.label}-${index}`}
                type="button"
                onClick={() => handleSelect(suggestion)}
                className="w-full flex items-start gap-2 p-2 text-left rounded hover:bg-muted transition-colors"
              >
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">{suggestion.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {suggestion.context}
                  </p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Commencez à taper pour rechercher une adresse
      </p>
    </div>
  );
}
