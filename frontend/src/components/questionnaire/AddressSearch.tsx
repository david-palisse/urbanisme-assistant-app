'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { AddressSuggestion } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { debounce } from '@/lib/utils';
import { Search, MapPin, Loader2, Home, MapPinned } from 'lucide-react';

type SearchMode = 'address' | 'parcel';

interface AddressSearchProps {
  onSelect: (address: AddressSuggestion) => void;
  initialValue?: string;
}

export function AddressSearch({ onSelect, initialValue = '' }: AddressSearchProps) {
  // Common state
  const [searchMode, setSearchMode] = useState<SearchMode>('address');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Address mode state
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Parcel mode state
  const [codeInsee, setCodeInsee] = useState('');
  const [section, setSection] = useState('');
  const [numero, setNumero] = useState('');

  const searchAddress = useCallback(
    debounce(async (searchQuery: string) => {
      if (searchQuery.length < 3) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const results = await api.searchAddress(searchQuery);
        setSuggestions(results);
        setShowSuggestions(true);
      } catch (err) {
        console.error('Address search failed:', err);
        setSuggestions([]);
        setError('Erreur lors de la recherche d\'adresse');
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

  const handleParcelSearch = async () => {
    // Validate inputs
    if (!codeInsee || codeInsee.length !== 5) {
      setError('Le code INSEE doit contenir 5 chiffres');
      return;
    }
    if (!section || section.length !== 2) {
      setError('La section cadastrale doit contenir 2 caractères');
      return;
    }
    if (!numero || numero.length !== 4) {
      setError('Le numéro de parcelle doit contenir 4 chiffres');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await api.searchParcel(codeInsee, section.toUpperCase(), numero);

      // Convert ParcelSearchResult to AddressSuggestion format
      const suggestion: AddressSuggestion = {
        label: result.address || `Parcelle ${result.parcel.section}${result.parcel.number}, ${result.city}`,
        lat: result.coordinates.lat,
        lon: result.coordinates.lon,
        city: result.city,
        postcode: result.postalCode,
        citycode: result.parcel.codeInsee,
        context: `${result.postalCode} ${result.city}`,
      };

      onSelect(suggestion);
    } catch (err) {
      console.error('Parcel search failed:', err);
      setError('Parcelle non trouvée. Vérifiez les informations saisies.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleModeSwitch = (mode: SearchMode) => {
    setSearchMode(mode);
    setError(null);
    // Reset state when switching modes
    if (mode === 'address') {
      setCodeInsee('');
      setSection('');
      setNumero('');
    } else {
      setQuery('');
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode toggle tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        <button
          type="button"
          onClick={() => handleModeSwitch('address')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            searchMode === 'address'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Home className="h-4 w-4" />
          Adresse
        </button>
        <button
          type="button"
          onClick={() => handleModeSwitch('parcel')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            searchMode === 'parcel'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <MapPinned className="h-4 w-4" />
          Parcelle
        </button>
      </div>

      {/* Address search mode */}
      {searchMode === 'address' && (
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
      )}

      {/* Parcel search mode */}
      {searchMode === 'parcel' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="codeInsee">Code INSEE</Label>
              <Input
                id="codeInsee"
                type="text"
                placeholder="75101"
                value={codeInsee}
                onChange={(e) => setCodeInsee(e.target.value.slice(0, 5))}
                maxLength={5}
              />
              <p className="text-xs text-muted-foreground">5 chiffres</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="section">Section</Label>
              <Input
                id="section"
                type="text"
                placeholder="AB"
                value={section}
                onChange={(e) => setSection(e.target.value.toUpperCase().slice(0, 2))}
                maxLength={2}
              />
              <p className="text-xs text-muted-foreground">2 caractères</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="numero">Numéro</Label>
              <Input
                id="numero"
                type="text"
                placeholder="0001"
                value={numero}
                onChange={(e) => setNumero(e.target.value.slice(0, 4))}
                maxLength={4}
              />
              <p className="text-xs text-muted-foreground">4 chiffres</p>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleParcelSearch}
            disabled={isLoading || !codeInsee || !section || !numero}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recherche en cours...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Rechercher la parcelle
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground">
            Vous pouvez trouver ces informations sur le site du cadastre (cadastre.gouv.fr)
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
