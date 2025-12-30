import { useState, useRef } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, MoreHorizontal, UserPlus, Upload, Download, CheckCircle, AlertCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importResult, setImportResult] = useState<{ total: number; created: number; skipped: number; errors: any[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.getUsers(),
    enabled: currentUser?.role === "admin",
  });

  const createMemberMutation = useMutation({
    mutationFn: (member: typeof newMember) => api.createUser(member),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        title: "Success",
        description: "New member added to the library.",
      });
      setAddDialogOpen(false);
      setNewMember({ name: "", email: "", password: "", role: "user" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add member",
        variant: "destructive",
      });
    },
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => api.importUsers(file),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setImportResult(result);
      toast({
        title: "Import Complete",
        description: `Created ${result.created} members, skipped ${result.skipped}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import members",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportResult(null);
      importMutation.mutate(file);
    }
  };

  const downloadTemplate = () => {
    const template = "name,email,password,role\nJohn Doe,john@example.com,password123,user\nJane Smith,jane@example.com,password123,admin";
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "members_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (currentUser?.role !== "admin") {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">You don't have permission to view this page.</p>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading members...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">Members</h1>
            <p className="text-muted-foreground mt-2">Manage library members and view their activity.</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={importDialogOpen} onOpenChange={(open) => { setImportDialogOpen(open); if (!open) setImportResult(null); }}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-import-members" className="gap-2">
                  <Upload className="h-4 w-4" />
                  Import CSV
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Import Members from CSV</DialogTitle>
                  <DialogDescription>
                    Upload a CSV file with member details. Required columns: name, email, password, role
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                    <Download className="h-4 w-4" />
                    Download Template CSV
                  </Button>
                  <div className="grid gap-2">
                    <Label>Upload CSV File</Label>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      data-testid="input-import-members-file"
                    />
                  </div>
                  {importMutation.isPending && (
                    <div className="text-center text-muted-foreground">Importing...</div>
                  )}
                  {importResult && (
                    <Alert variant={importResult.errors.length > 0 ? "destructive" : "default"}>
                      {importResult.errors.length > 0 ? (
                        <AlertCircle className="h-4 w-4" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      <AlertTitle>Import Results</AlertTitle>
                      <AlertDescription>
                        <div>Total rows: {importResult.total}</div>
                        <div>Created: {importResult.created}</div>
                        <div>Skipped: {importResult.skipped}</div>
                        {importResult.errors.length > 0 && (
                          <div className="mt-2">
                            <strong>Errors:</strong>
                            <ul className="text-xs mt-1 max-h-32 overflow-y-auto">
                              {importResult.errors.slice(0, 5).map((err, i) => (
                                <li key={i}>Row {err.row}: {err.error}</li>
                              ))}
                              {importResult.errors.length > 5 && (
                                <li>...and {importResult.errors.length - 5} more errors</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Close</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-member" className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Add Member
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New Member</DialogTitle>
                  <DialogDescription>
                    Create a new library member account.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      data-testid="input-member-name"
                      value={newMember.name}
                      onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                      placeholder="Enter full name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      data-testid="input-member-email"
                      value={newMember.email}
                      onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                      placeholder="member@example.com"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      data-testid="input-member-password"
                      value={newMember.password}
                      onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
                      placeholder="Minimum 6 characters"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={newMember.role}
                      onValueChange={(value) => setNewMember({ ...newMember, role: value })}
                    >
                      <SelectTrigger data-testid="select-member-role">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
                  <Button 
                    data-testid="button-save-member"
                    onClick={() => createMemberMutation.mutate(newMember)}
                    disabled={createMemberMutation.isPending || !newMember.name || !newMember.email || newMember.password.length < 6}
                  >
                    {createMemberMutation.isPending ? "Adding..." : "Add Member"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="bg-card rounded-lg border shadow-sm">
          <div className="p-4 border-b flex items-center gap-4">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                data-testid="input-search-members"
                placeholder="Search members..." 
                className="pl-10" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Active Loans</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} />
                        <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{user.name}</span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      user.role === "admin" 
                        ? "text-purple-600 border-purple-200 bg-purple-50" 
                        : "text-blue-600 border-blue-200 bg-blue-50"
                    }>
                      {user.role === "admin" ? "Admin" : "Member"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      user.status === "active" ? "text-emerald-600 border-emerald-200 bg-emerald-50" : 
                      user.status === "overdue" ? "text-red-600 border-red-200 bg-red-50" : 
                      "text-slate-600 border-slate-200 bg-slate-50"
                    }>
                      {user.status === "active" ? "Active" : user.status === "overdue" ? "Overdue" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.activeLoans}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(user.createdAt), "MMM yyyy")}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>View Loan History</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No members found.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
