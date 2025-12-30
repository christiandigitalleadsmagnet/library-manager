import { useState, useRef, useEffect, useCallback } from "react";
import { Layout } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Trash2, Upload, Download, QrCode, Camera, CheckCircle, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
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
import { addDays } from "date-fns";

const categories = ["Design", "Psychology", "Technology", "Sci-Fi", "Self-Help", "Business", "History", "Fiction", "Science", "General"];

export default function Catalog() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [importResult, setImportResult] = useState<{ total: number; created: number; skipped: number; errors: any[] } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);
  const readerRef = useRef<any>(null);
  
  const [newBook, setNewBook] = useState({
    title: "",
    author: "",
    isbn: "",
    category: "Technology",
    totalCopies: 1,
    availableCopies: 1,
  });

  const { data: books = [], isLoading } = useQuery({
    queryKey: ["books"],
    queryFn: () => api.getBooks(),
  });

  const borrowMutation = useMutation({
    mutationFn: (bookId: string) => {
      const dueDate = addDays(new Date(), 14);
      return api.borrowBook(bookId, dueDate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast({
        title: "Success",
        description: "Book borrowed successfully. Due in 14 days.",
      });
      setSelectedBook(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to borrow book",
        variant: "destructive",
      });
    },
  });

  const createBookMutation = useMutation({
    mutationFn: (book: typeof newBook) => api.createBook({ ...book, status: "available" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      toast({
        title: "Success",
        description: "Book added to the library.",
      });
      setAddDialogOpen(false);
      setNewBook({ title: "", author: "", isbn: "", category: "Technology", totalCopies: 1, availableCopies: 1 });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add book",
        variant: "destructive",
      });
    },
  });

  const deleteBookMutation = useMutation({
    mutationFn: (bookId: string) => api.deleteBook(bookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      toast({
        title: "Success",
        description: "Book removed from the library.",
      });
      setDeleteDialogOpen(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete book",
        variant: "destructive",
      });
    },
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => api.importBooks(file),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      setImportResult(result);
      toast({
        title: "Import Complete",
        description: `Created ${result.created} books, skipped ${result.skipped}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import books",
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
    const template = "title,author,isbn,category,totalCopies\nThe Great Gatsby,F. Scott Fitzgerald,978-0743273565,Fiction,3\n1984,George Orwell,978-0451524935,Fiction,2";
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "books_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const stopQrScanner = useCallback(() => {
    scanningRef.current = false;
    setIsScanning(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (readerRef.current) {
      readerRef.current = null;
    }
  }, []);

  const forceCapture = async () => {
    if (!videoRef.current || !readerRef.current) {
      toast({
        title: "Scanner not ready",
        description: "Please start the camera first",
        variant: "destructive",
      });
      return;
    }

    try {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        
        try {
          const result = await reader.decodeFromCanvas(canvas);
          if (result) {
            const scannedIsbn = result.getText();
            stopQrScanner();
            setScannedCode(scannedIsbn);
            setNewBook(prev => ({ ...prev, isbn: scannedIsbn }));
            setQrDialogOpen(false);
            setAddDialogOpen(true);
            toast({
              title: "Code Captured Successfully",
              description: `ISBN: ${scannedIsbn}`,
            });
            return;
          }
        } catch (decodeError) {
          toast({
            title: "No barcode detected",
            description: "Try adjusting the camera position or lighting, then capture again",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Capture failed",
        description: "Could not capture from camera",
        variant: "destructive",
      });
    }
  };

  const startQrScanner = async () => {
    try {
      scanningRef.current = true;
      setIsScanning(true);
      setScannedCode("");
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        readerRef.current = reader;
        
        const scanLoop = async () => {
          if (!videoRef.current || !scanningRef.current) return;
          
          try {
            const result = await reader.decodeOnceFromVideoElement(videoRef.current);
            if (result && scanningRef.current) {
              const scannedIsbn = result.getText();
              stopQrScanner();
              setScannedCode(scannedIsbn);
              setNewBook(prev => ({ ...prev, isbn: scannedIsbn }));
              setQrDialogOpen(false);
              setAddDialogOpen(true);
              toast({
                title: "Code Scanned Successfully",
                description: `ISBN: ${scannedIsbn} - Now fill in the book details`,
              });
              return;
            }
          } catch (e) {
            // Decode failed, continue scanning
          }
          
          if (scanningRef.current) {
            requestAnimationFrame(() => {
              setTimeout(scanLoop, 100);
            });
          }
        };
        
        // Start scanning after a brief delay for camera to initialize
        setTimeout(scanLoop, 500);
      }
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please ensure camera permissions are granted.",
        variant: "destructive",
      });
      scanningRef.current = false;
      setIsScanning(false);
    }
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.isbn.includes(searchTerm)
  );

  const getCoverColors = (category: string) => {
    const colors: Record<string, { bg: string; accent: string }> = {
      Design: { bg: "bg-orange-100", accent: "bg-orange-500" },
      Psychology: { bg: "bg-blue-100", accent: "bg-blue-500" },
      Technology: { bg: "bg-green-100", accent: "bg-green-500" },
      "Sci-Fi": { bg: "bg-amber-100", accent: "bg-amber-500" },
      "Self-Help": { bg: "bg-slate-100", accent: "bg-slate-500" },
      Business: { bg: "bg-purple-100", accent: "bg-purple-500" },
      History: { bg: "bg-rose-100", accent: "bg-rose-500" },
      Fiction: { bg: "bg-cyan-100", accent: "bg-cyan-500" },
      Science: { bg: "bg-teal-100", accent: "bg-teal-500" },
      General: { bg: "bg-gray-100", accent: "bg-gray-500" },
    };
    return colors[category] || { bg: "bg-gray-100", accent: "bg-gray-500" };
  };

  const isAdmin = user?.role === "admin";

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading books...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">Catalog</h1>
            <p className="text-muted-foreground mt-2">Browse and manage the library collection.</p>
          </div>
          {isAdmin && (
            <div className="flex gap-2 flex-wrap">
              <Dialog open={importDialogOpen} onOpenChange={(open) => { setImportDialogOpen(open); if (!open) setImportResult(null); }}>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="button-import-books" className="gap-2">
                    <Upload className="h-4 w-4" />
                    Import CSV
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Import Books from CSV</DialogTitle>
                    <DialogDescription>
                      Upload a CSV file with book details. Required columns: title, author, isbn, category, totalCopies
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
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        data-testid="input-import-books-file"
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

              <Dialog open={qrDialogOpen} onOpenChange={(open) => { setQrDialogOpen(open); if (!open) stopQrScanner(); }}>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="button-scan-qr" className="gap-2">
                    <QrCode className="h-4 w-4" />
                    Scan QR/Barcode
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Scan Book QR Code or Barcode</DialogTitle>
                    <DialogDescription>
                      Scan a book's ISBN barcode or QR code to quickly add it to the library.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    {!isScanning ? (
                      <Button onClick={startQrScanner} className="gap-2">
                        <Camera className="h-4 w-4" />
                        Start Camera
                      </Button>
                    ) : (
                      <div className="space-y-3">
                        <div className="relative">
                          <video 
                            ref={videoRef} 
                            className="w-full rounded-lg border"
                            style={{ maxHeight: "300px" }}
                          />
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={stopQrScanner}
                            className="absolute top-2 right-2"
                          >
                            Stop
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            onClick={forceCapture}
                            className="flex-1 gap-2"
                            data-testid="button-force-capture"
                          >
                            <Camera className="h-4 w-4" />
                            Capture Now
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground text-center">
                          Point camera at barcode and tap "Capture Now" to scan
                        </p>
                      </div>
                    )}
                    {scannedCode && (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertTitle>Code Scanned!</AlertTitle>
                        <AlertDescription>
                          ISBN: {scannedCode}
                          <Button 
                            variant="link" 
                            size="sm" 
                            onClick={() => {
                              setQrDialogOpen(false);
                              setAddDialogOpen(true);
                            }}
                          >
                            Add this book
                          </Button>
                        </AlertDescription>
                      </Alert>
                    )}
                    <div className="grid gap-2">
                      <Label>Or enter ISBN manually:</Label>
                      <Input
                        placeholder="978-0000000000"
                        value={scannedCode}
                        onChange={(e) => setScannedCode(e.target.value)}
                        data-testid="input-manual-isbn"
                      />
                      <Button 
                        variant="outline"
                        onClick={() => {
                          if (scannedCode) {
                            setNewBook(prev => ({ ...prev, isbn: scannedCode }));
                            setQrDialogOpen(false);
                            setAddDialogOpen(true);
                          }
                        }}
                        disabled={!scannedCode}
                      >
                        Use this ISBN
                      </Button>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setQrDialogOpen(false)}>Close</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-book" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Book
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Add New Book</DialogTitle>
                    <DialogDescription>
                      Fill in the details to add a new book to the library.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        data-testid="input-book-title"
                        value={newBook.title}
                        onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                        placeholder="Enter book title"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="author">Author</Label>
                      <Input
                        id="author"
                        data-testid="input-book-author"
                        value={newBook.author}
                        onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                        placeholder="Enter author name"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="isbn">ISBN</Label>
                      <Input
                        id="isbn"
                        data-testid="input-book-isbn"
                        value={newBook.isbn}
                        onChange={(e) => setNewBook({ ...newBook, isbn: e.target.value })}
                        placeholder="978-0000000000"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={newBook.category}
                        onValueChange={(value) => setNewBook({ ...newBook, category: value })}
                      >
                        <SelectTrigger data-testid="select-book-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="copies">Number of Copies</Label>
                      <Input
                        id="copies"
                        data-testid="input-book-copies"
                        type="number"
                        min={1}
                        value={newBook.totalCopies}
                        onChange={(e) => {
                          const copies = parseInt(e.target.value) || 1;
                          setNewBook({ ...newBook, totalCopies: copies, availableCopies: copies });
                        }}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
                    <Button 
                      data-testid="button-save-book"
                      onClick={() => createBookMutation.mutate(newBook)}
                      disabled={createBookMutation.isPending || !newBook.title || !newBook.author || !newBook.isbn}
                    >
                      {createBookMutation.isPending ? "Adding..." : "Add Book"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              data-testid="input-search"
              placeholder="Search by title, author, or ISBN..." 
              className="pl-10 bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBooks.map((book) => {
            const colors = getCoverColors(book.category);
            return (
              <div 
                key={book.id} 
                data-testid={`card-book-${book.id}`}
                className="group bg-card border rounded-lg overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col"
              >
                <div className={`h-48 ${colors.bg} relative p-6 flex items-center justify-center`}>
                  <div className={`w-24 h-36 ${colors.accent} rounded-sm shadow-xl transform group-hover:scale-105 transition-transform duration-500 relative`}>
                     <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/20 rounded-l-sm" />
                     <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center">
                       <span className="text-[8px] font-bold text-white/90 uppercase tracking-wider">{book.author}</span>
                       <span className="text-[10px] font-serif font-bold text-white leading-tight mt-2">{book.title}</span>
                     </div>
                  </div>
                  <Badge 
                    variant={book.status === "available" ? "default" : "secondary"} 
                    className={`absolute top-4 right-4 ${
                      book.status === "available" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {book.status === "available" ? "Available" : "Borrowed"}
                  </Badge>
                  {isAdmin && (
                    <Dialog open={deleteDialogOpen === book.id} onOpenChange={(open) => setDeleteDialogOpen(open ? book.id : null)}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="destructive" 
                          size="icon" 
                          className="absolute top-4 left-4 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Delete Book</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to delete "{book.title}"? This action cannot be undone.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setDeleteDialogOpen(null)}>Cancel</Button>
                          <Button 
                            variant="destructive"
                            onClick={() => deleteBookMutation.mutate(book.id)}
                            disabled={deleteBookMutation.isPending}
                          >
                            {deleteBookMutation.isPending ? "Deleting..." : "Delete"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <div className="mb-4">
                    <p className="text-xs font-medium text-primary uppercase tracking-wider mb-1">{book.category}</p>
                    <h3 className="font-serif font-bold text-lg leading-tight text-foreground group-hover:text-primary transition-colors">
                      {book.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">by {book.author}</p>
                  </div>

                  <div className="mt-auto pt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
                    <span>{book.availableCopies} of {book.totalCopies} available</span>
                    {book.availableCopies > 0 && (
                      <Dialog open={selectedBook === book.id} onOpenChange={(open) => setSelectedBook(open ? book.id : null)}>
                        <DialogTrigger asChild>
                          <Button 
                            data-testid={`button-borrow-${book.id}`}
                            variant="ghost" 
                            size="sm" 
                            className="h-8 hover:text-primary hover:bg-primary/10"
                          >
                            Borrow
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Borrow Book</DialogTitle>
                            <DialogDescription>
                              Confirm borrowing "{book.title}" by {book.author}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-4">
                            <p className="text-sm text-muted-foreground">
                              This book will be due in 14 days from today.
                            </p>
                          </div>
                          <DialogFooter>
                            <Button 
                              variant="outline" 
                              onClick={() => setSelectedBook(null)}
                            >
                              Cancel
                            </Button>
                            <Button 
                              data-testid="button-confirm-borrow"
                              onClick={() => borrowMutation.mutate(book.id)}
                              disabled={borrowMutation.isPending}
                            >
                              {borrowMutation.isPending ? "Borrowing..." : "Confirm Borrow"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredBooks.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No books found matching your search.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
