'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useProject } from '@/lib/project-context';
import { AddressSuggestion } from '@/types';
import { AddressSearch } from '@/components/questionnaire/AddressSearch';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { Loader2, ArrowRight, MapPin, Check } from 'lucide-react';

export default function AddressPage() {
  const params = useParams();
  const router = useRouter();
  const { project, refreshProject } = useProject();
  const [selectedAddress, setSelectedAddress] = useState<AddressSuggestion | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const projectId = params.id as string;

  const handleAddressSelect = async (address: AddressSuggestion) => {
    setSelectedAddress(address);
  };

  const handleAddressSubmit = async () => {
    if (!selectedAddress) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner une adresse.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      await api.updateProjectAddress(projectId, {
        rawInput: selectedAddress.label,
        lat: selectedAddress.lat,
        lon: selectedAddress.lon,
        inseeCode: selectedAddress.citycode,
        cityName: selectedAddress.city,
        postCode: selectedAddress.postcode,
      });

      // Update PLU zone
      await api.updateProjectPluZone(projectId);

      // Refresh project in context
      await refreshProject();

      toast({
        title: 'Adresse enregistrée',
        description: "L'adresse a été enregistrée avec succès.",
      });

      // Redirect to address-info page to show regulatory information
      router.push(`/projects/${projectId}/address-info`);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: "Impossible d'enregistrer l'adresse.",
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Loading and error states are handled by the layout
  if (!project) {
    return null;
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Adresse du terrain</h1>
        <p className="text-muted-foreground mt-1">
          {project.name} - Localisez votre terrain pour obtenir les informations réglementaires
        </p>
      </div>

      {/* Current address display if exists */}
      {project.address && !selectedAddress && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <Check className="h-5 w-5 text-green-700" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-green-800">Adresse actuelle</p>
                <p className="text-sm text-green-700">
                  {project.address.rawInput || `${project.address.cityName} (${project.address.postCode})`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Address search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {project.address ? 'Modifier l\'adresse' : 'Localisation du terrain'}
          </CardTitle>
          <CardDescription>
            {project.address
              ? 'Recherchez une nouvelle adresse pour modifier la localisation de votre terrain'
              : 'Recherchez et sélectionnez l\'adresse de votre terrain'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AddressSearch
            onSelect={handleAddressSelect}
            initialValue={project.address?.rawInput || ''}
          />

          {selectedAddress && (
            <div className="p-4 rounded-lg bg-muted">
              <p className="font-medium">{selectedAddress.label}</p>
              <p className="text-sm text-muted-foreground">
                {selectedAddress.context}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleAddressSubmit}
          disabled={!selectedAddress || isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              Enregistrer et continuer
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
