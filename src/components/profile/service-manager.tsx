"use client";

import { useState } from "react";
import { Service } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Edit3, Save, X } from "lucide-react";

interface ServiceManagerProps {
  services: Service[];
  onChange: (services: Service[]) => void;
}

export function ServiceManager({ services, onChange }: ServiceManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

  function startAdding() {
    setTitle("");
    setDescription("");
    setPrice("");
    setIsAdding(true);
    setEditingId(null);
  }

  function startEditing(service: Service) {
    setTitle(service.title);
    setDescription(service.description);
    setPrice(String(service.price));
    setEditingId(service.id);
    setIsAdding(false);
  }

  function cancel() {
    setIsAdding(false);
    setEditingId(null);
  }

  function handleSave() {
    if (!title || !description || !price) return;

    const priceNum = parseInt(price);
    if (isNaN(priceNum)) return;

    if (isAdding) {
      const newService: Service = {
        id: crypto.randomUUID(),
        title,
        description,
        price: priceNum,
      };
      onChange([...services, newService]);
    } else if (editingId) {
      const updatedServices = services.map((s) =>
        s.id === editingId
          ? { ...s, title, description, price: priceNum }
          : s
      );
      onChange(updatedServices);
    }

    cancel();
  }

  function handleDelete(id: string) {
    onChange(services.filter((s) => s.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">My Services</h3>
        {!isAdding && !editingId && (
          <Button size="sm" onClick={startAdding}>
            <Plus className="mr-1 h-4 w-4" />
            Add Service
          </Button>
        )}
      </div>

      {(isAdding || editingId) && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label htmlFor="svc-title">Service Title</Label>
              <Input
                id="svc-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. VIP Event Companion"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="svc-desc">Description</Label>
              <Textarea
                id="svc-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this service includes..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="svc-price">Price (₦)</Label>
              <Input
                id="svc-price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 50000"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                {isAdding ? "Add Service" : "Update Service"}
              </Button>
              <Button size="sm" variant="outline" onClick={cancel}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {services.length === 0 && !isAdding && (
          <p className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
            No services added yet. Click &quot;Add Service&quot; to start.
          </p>
        )}
        {services.map((service) => (
          <Card key={service.id} className="group">
            <CardContent className="flex items-start justify-between p-4">
              <div className="space-y-1">
                <p className="font-semibold">{service.title}</p>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {service.description}
                </p>
                <p className="text-sm font-bold text-primary">
                  ₦{service.price.toLocaleString()}
                </p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => startEditing(service)}
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(service.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
