import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { BookOpen, Clock, AlertTriangle, CheckCircle, Calendar, Search, User, X } from "lucide-react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, type LoanWithBook } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

interface SearchUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface UserLoansData {
  user: { id: string; name: string; email: string };
  loans: LoanWithBook[];
}

function LoanCard({ loan, onReturn, showReturn = true }: { loan: LoanWithBook; onReturn?: (id: string) => void; showReturn?: boolean }) {
  const getDueDateStatus = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (isPast(due)) {
      return { status: "overdue", color: "destructive" as const, icon: AlertTriangle };
    } else if (daysUntilDue <= 3) {
      return { status: "due-soon", color: "warning" as const, icon: Clock };
    } else {
      return { status: "on-time", color: "secondary" as const, icon: Calendar };
    }
  };

  const dueDateInfo = getDueDateStatus(loan.dueDate);
  const DueIcon = dueDateInfo.icon;
  const isActive = loan.status === "active";
  
  return (
    <Card data-testid={`card-loan-${loan.id}`} className={!isActive ? "opacity-75" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{loan.bookTitle}</CardTitle>
            <CardDescription>{loan.bookAuthor}</CardDescription>
          </div>
          {isActive ? (
            <Badge variant={dueDateInfo.color}>
              <DueIcon className="h-3 w-3 mr-1" />
              {dueDateInfo.status === "overdue" ? "Overdue" : 
               dueDateInfo.status === "due-soon" ? "Due Soon" : "On Time"}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-green-600 border-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              Returned
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Borrowed</p>
            <p className="font-medium">{format(new Date(loan.borrowedAt), "MMM d, yyyy")}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{isActive ? "Due Date" : "Returned"}</p>
            <p className={`font-medium ${isActive && isPast(new Date(loan.dueDate)) ? "text-destructive" : ""}`}>
              {isActive 
                ? format(new Date(loan.dueDate), "MMM d, yyyy")
                : loan.returnedAt ? format(new Date(loan.returnedAt), "MMM d, yyyy") : "-"
              }
            </p>
          </div>
        </div>
        {isActive && (
          <>
            <div className="text-sm">
              <p className="text-muted-foreground">Time Remaining</p>
              <p className={`font-medium ${isPast(new Date(loan.dueDate)) ? "text-destructive" : ""}`}>
                {isPast(new Date(loan.dueDate)) 
                  ? `${formatDistanceToNow(new Date(loan.dueDate))} overdue`
                  : `${formatDistanceToNow(new Date(loan.dueDate))} left`
                }
              </p>
            </div>
            {showReturn && onReturn && (
              <Button 
                data-testid={`button-return-${loan.id}`}
                variant="outline" 
                className="w-full"
                onClick={() => onReturn(loan.id)}
              >
                Return Book
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AdminLoansView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [userLoans, setUserLoans] = useState<LoanWithBook[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingLoans, setIsLoadingLoans] = useState(false);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const timer = setTimeout(async () => {
        setIsSearching(true);
        try {
          const results = await api.searchUsers(searchQuery);
          setSearchResults(results);
        } catch (error) {
          toast({ title: "Error", description: "Failed to search users", variant: "destructive" });
        } finally {
          setIsSearching(false);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const handleSelectUser = async (user: SearchUser) => {
    setSelectedUser({ id: user.id, name: user.name, email: user.email });
    setSearchQuery("");
    setSearchResults([]);
    setIsLoadingLoans(true);
    
    try {
      const data = await api.getUserLoans(user.id);
      setUserLoans(data.loans);
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch user loans", variant: "destructive" });
    } finally {
      setIsLoadingLoans(false);
    }
  };

  const handleClearUser = () => {
    setSelectedUser(null);
    setUserLoans([]);
  };

  const handleReturn = async (transactionId: string) => {
    try {
      await api.returnBook(transactionId);
      if (selectedUser) {
        const data = await api.getUserLoans(selectedUser.id);
        setUserLoans(data.loans);
      }
      toast({ title: "Success", description: "Book returned successfully" });
    } catch (error) {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to return book",
        variant: "destructive" 
      });
    }
  };

  const activeLoans = userLoans.filter(loan => loan.status === "active");
  const returnedLoans = userLoans.filter(loan => loan.status === "returned");

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-serif font-bold">Member Loans</h1>
          <p className="text-muted-foreground mt-1">
            Search for a member to view their borrowing history
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5" />
              Find Member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Input
                data-testid="input-search-user"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              )}
              
              {searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-card border rounded-md shadow-lg max-h-60 overflow-auto">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      data-testid={`search-result-${user.id}`}
                      className="w-full px-4 py-3 text-left hover:bg-muted flex items-center gap-3 border-b last:border-b-0"
                      onClick={() => handleSelectUser(user)}
                    >
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <Badge variant="outline" className="ml-auto">{user.role}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedUser && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {selectedUser.name}
                  </CardTitle>
                  <CardDescription>{selectedUser.email}</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={handleClearUser}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
          </Card>
        )}

        {selectedUser && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Loans</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeLoans.length}</div>
                <p className="text-xs text-muted-foreground">Currently borrowed</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {activeLoans.filter(l => isPast(new Date(l.dueDate))).length}
                </div>
                <p className="text-xs text-muted-foreground">Needs attention</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Borrowed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userLoans.length}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>
          </div>
        )}

        {isLoadingLoans ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">Loading loans...</p>
          </div>
        ) : selectedUser && userLoans.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No loans found</h3>
              <p className="text-muted-foreground text-center">
                This member hasn't borrowed any books yet
              </p>
            </CardContent>
          </Card>
        ) : selectedUser && (
          <div className="space-y-6">
            {activeLoans.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Currently Borrowed ({activeLoans.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {activeLoans.map((loan) => (
                    <LoanCard key={loan.id} loan={loan} onReturn={handleReturn} />
                  ))}
                </div>
              </div>
            )}

            {returnedLoans.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Returned ({returnedLoans.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {returnedLoans.slice(0, 6).map((loan) => (
                    <LoanCard key={loan.id} loan={loan} showReturn={false} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!selectedUser && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Search for a member</h3>
              <p className="text-muted-foreground text-center">
                Enter a name or email to view their borrowing details
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

function UserLoansView() {
  const { data: loans = [], isLoading, refetch } = useQuery<LoanWithBook[]>({
    queryKey: ["/api/transactions/my-loans"],
    queryFn: () => api.getMyLoans(),
  });

  const activeLoans = loans.filter(loan => loan.status === "active");
  const returnedLoans = loans.filter(loan => loan.status === "returned");

  const handleReturn = async (transactionId: string) => {
    try {
      await api.returnBook(transactionId);
      refetch();
      toast({ title: "Success", description: "Book returned successfully" });
    } catch (error) {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to return book",
        variant: "destructive" 
      });
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-serif font-bold">My Loans</h1>
          <p className="text-muted-foreground mt-1">
            Track your borrowed books and due dates
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Loans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeLoans.length}</div>
              <p className="text-xs text-muted-foreground">Currently borrowed</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {activeLoans.filter(l => isPast(new Date(l.dueDate))).length}
              </div>
              <p className="text-xs text-muted-foreground">Needs attention</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Borrowed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loans.length}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading your loans...</p>
          </div>
        ) : activeLoans.length === 0 && returnedLoans.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No loans yet</h3>
              <p className="text-muted-foreground text-center">
                Visit the catalog to borrow your first book
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {activeLoans.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Currently Borrowed ({activeLoans.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {activeLoans.map((loan) => (
                    <LoanCard key={loan.id} loan={loan} onReturn={handleReturn} />
                  ))}
                </div>
              </div>
            )}

            {returnedLoans.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Returned ({returnedLoans.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {returnedLoans.slice(0, 6).map((loan) => (
                    <LoanCard key={loan.id} loan={loan} showReturn={false} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

export default function MyLoansPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  
  if (isAdmin) {
    return <AdminLoansView />;
  }
  
  return <UserLoansView />;
}
