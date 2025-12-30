import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Building2, Users, BookOpen, Mail, MapPin } from "lucide-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";
import { api, type School } from "@/lib/api";

const schoolFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z.string().min(2, "Slug must be at least 2 characters").regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  address: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
});

type SchoolFormData = z.infer<typeof schoolFormSchema>;

export default function SchoolsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const queryClient = useQueryClient();

  const { data: schools = [], isLoading } = useQuery<School[]>({
    queryKey: ["/api/schools"],
    queryFn: () => api.getSchools(),
  });

  const createForm = useForm<SchoolFormData>({
    resolver: zodResolver(schoolFormSchema),
    defaultValues: { name: "", slug: "", address: "", contactEmail: "" },
  });

  const editForm = useForm<SchoolFormData>({
    resolver: zodResolver(schoolFormSchema),
    defaultValues: { name: "", slug: "", address: "", contactEmail: "" },
  });

  const createMutation = useMutation({
    mutationFn: (data: SchoolFormData) => api.createSchool(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schools"] });
      setIsCreateOpen(false);
      createForm.reset();
      toast({ title: "Success", description: "School created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SchoolFormData }) => api.updateSchool(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schools"] });
      setEditingSchool(null);
      toast({ title: "Success", description: "School updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onCreateSubmit = (data: SchoolFormData) => {
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: SchoolFormData) => {
    if (editingSchool) {
      updateMutation.mutate({ id: editingSchool.id, data });
    }
  };

  const openEditDialog = (school: School) => {
    setEditingSchool(school);
    editForm.reset({
      name: school.name,
      slug: school.slug,
      address: school.address || "",
      contactEmail: school.contactEmail || "",
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold">Library Management</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage library instances for different schools
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-school">
                <Plus className="mr-2 h-4 w-4" />
                Create Library
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Library</DialogTitle>
                <DialogDescription>
                  Set up a new library instance for a school
                </DialogDescription>
              </DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                  <FormField
                    control={createForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>School Name</FormLabel>
                        <FormControl>
                          <Input data-testid="input-school-name" placeholder="Springfield High School" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unique Identifier (Slug)</FormLabel>
                        <FormControl>
                          <Input data-testid="input-school-slug" placeholder="springfield-high" {...field} />
                        </FormControl>
                        <FormDescription>
                          Lowercase letters, numbers, and hyphens only
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address (Optional)</FormLabel>
                        <FormControl>
                          <Input data-testid="input-school-address" placeholder="123 Main St, City" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Email (Optional)</FormLabel>
                        <FormControl>
                          <Input data-testid="input-school-email" type="email" placeholder="library@school.edu" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button data-testid="button-submit-school" type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Creating..." : "Create Library"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading schools...</p>
          </div>
        ) : schools.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No libraries yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first library instance to get started
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Library
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {schools.map((school) => (
              <Card key={school.id} data-testid={`card-school-${school.id}`} className="group hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-lg">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{school.name}</CardTitle>
                        <CardDescription className="text-xs font-mono">{school.slug}</CardDescription>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => openEditDialog(school)}
                      data-testid={`button-edit-school-${school.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {school.address && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{school.address}</span>
                    </div>
                  )}
                  {school.contactEmail && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      <span>{school.contactEmail}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      <span>Members</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>Books</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={!!editingSchool} onOpenChange={(open) => !open && setEditingSchool(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Library</DialogTitle>
              <DialogDescription>
                Update library information
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>School Name</FormLabel>
                      <FormControl>
                        <Input data-testid="input-edit-school-name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unique Identifier (Slug)</FormLabel>
                      <FormControl>
                        <Input data-testid="input-edit-school-slug" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address (Optional)</FormLabel>
                      <FormControl>
                        <Input data-testid="input-edit-school-address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email (Optional)</FormLabel>
                      <FormControl>
                        <Input data-testid="input-edit-school-email" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setEditingSchool(null)}>
                    Cancel
                  </Button>
                  <Button data-testid="button-update-school" type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
