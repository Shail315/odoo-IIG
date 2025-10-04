"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PlusCircle, Upload, Loader2, FileText, CheckCircle, XCircle, Clock, DollarSign, Camera, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';

interface User {
  id: number;
  name: string;
  role: string;
  companyId: number;
}

interface Company {
  id: number;
  name: string;
  currency: string;
}

interface EmployeeDashboardProps {
  user: User;
  company: Company;
}

interface Expense {
  id: number;
  amount: number;
  currency: string;
  convertedAmount: number;
  category: string;
  description: string;
  expenseDate: string;
  status: string;
  receiptUrl?: string;
  createdAt: string;
}

export default function EmployeeDashboard({ user, company }: EmployeeDashboardProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [activeEntryTab, setActiveEntryTab] = useState('manual');
  
  const [formData, setFormData] = useState({
    amount: '',
    currency: company.currency,
    category: '',
    description: '',
    expenseDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchExpenses();
  }, [user.id]);

  const fetchExpenses = async () => {
    try {
      const response = await fetch(`/api/expenses/by-employee/${user.id}`);
      const data = await response.json();
      setExpenses(data);
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    setError('');
    setOcrProcessing(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setReceiptImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to OCR API
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('OCR processing failed');
      }

      const result = await response.json();

      if (result.success && result.parsed) {
        // Auto-fill form with OCR results
        setFormData(prev => ({
          ...prev,
          amount: result.parsed.amount?.toString() || prev.amount,
          currency: result.parsed.currency || prev.currency,
          category: result.parsed.category || prev.category,
          description: result.parsed.description || result.parsed.merchantName || prev.description,
          expenseDate: result.parsed.date || prev.expenseDate,
        }));

        setSuccess('Receipt scanned successfully! Please review the extracted data.');
        setActiveEntryTab('manual'); // Switch to manual tab to review
      } else {
        setError('Could not extract data from receipt. Please enter manually.');
      }
    } catch (err: any) {
      console.error('OCR Error:', err);
      setError(err.message || 'Failed to process receipt');
    } finally {
      setOcrProcessing(false);
    }
  };

  const clearReceipt = () => {
    setReceiptImage(null);
    setFormData({
      amount: '',
      currency: company.currency,
      category: '',
      description: '',
      expenseDate: new Date().toISOString().split('T')[0]
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      // Convert currency if different from company currency
      let convertedAmount = parseFloat(formData.amount);
      
      if (formData.currency !== company.currency) {
        const conversionResponse = await fetch(
          `/api/currency-convert?base=${formData.currency}&target=${company.currency}&amount=${formData.amount}`
        );
        const conversionData = await conversionResponse.json();
        convertedAmount = conversionData.convertedAmount;
      }

      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: user.id,
          companyId: company.id,
          amount: parseFloat(formData.amount),
          currency: formData.currency,
          convertedAmount,
          category: formData.category,
          description: formData.description,
          expenseDate: new Date(formData.expenseDate).toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit expense');
      }

      setSuccess('Expense submitted successfully!');
      setDialogOpen(false);
      setFormData({
        amount: '',
        currency: company.currency,
        category: '',
        description: '',
        expenseDate: new Date().toISOString().split('T')[0]
      });
      fetchExpenses();
    } catch (err: any) {
      setError(err.message || 'Failed to submit expense');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const stats = {
    total: expenses.length,
    pending: expenses.filter(e => e.status === 'pending').length,
    approved: expenses.filter(e => e.status === 'approved').length,
    rejected: expenses.filter(e => e.status === 'rejected').length,
    totalAmount: expenses
      .filter(e => e.status === 'approved')
      .reduce((sum, e) => sum + e.convertedAmount, 0)
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">My Expenses</h2>
          <p className="text-muted-foreground">Track and submit your expense claims</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="w-4 h-4 mr-2" />
              Submit Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Submit New Expense</DialogTitle>
              <DialogDescription>Scan a receipt or enter details manually</DialogDescription>
            </DialogHeader>
            
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="bg-green-50 text-green-900 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800">
                <CheckCircle className="w-4 h-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <Tabs value={activeEntryTab} onValueChange={setActiveEntryTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="scan">
                  <Camera className="w-4 h-4 mr-2" />
                  Scan Receipt
                </TabsTrigger>
                <TabsTrigger value="manual">
                  <FileText className="w-4 h-4 mr-2" />
                  Manual Entry
                </TabsTrigger>
              </TabsList>

              <TabsContent value="scan" className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  {ocrProcessing ? (
                    <div className="py-8">
                      <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary mb-4" />
                      <p className="text-sm text-muted-foreground">Processing receipt...</p>
                    </div>
                  ) : receiptImage ? (
                    <div className="space-y-4">
                      <div className="relative inline-block">
                        <Image
                          src={receiptImage}
                          alt="Receipt preview"
                          width={300}
                          height={400}
                          className="rounded-lg border max-h-64 w-auto object-contain mx-auto"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2"
                          onClick={clearReceipt}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Receipt uploaded successfully! Review the details in Manual Entry tab.
                      </p>
                      <Button
                        type="button"
                        onClick={() => setActiveEntryTab('manual')}
                        className="w-full"
                      >
                        Review & Submit
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-lg font-semibold mb-2">Upload Receipt Image</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Take a photo or upload an image of your receipt
                      </p>
                      <Label htmlFor="receipt-upload" className="cursor-pointer">
                        <div className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                          <Camera className="w-4 h-4 mr-2" />
                          Choose Image
                        </div>
                        <Input
                          id="receipt-upload"
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </Label>
                      <p className="text-xs text-muted-foreground mt-2">
                        Supports JPG, PNG (max 5MB)
                      </p>
                    </>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="manual">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        required
                        disabled={submitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Select
                        value={formData.currency}
                        onValueChange={(value) => setFormData({ ...formData, currency: value })}
                        disabled={submitting}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD - US Dollar</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                          <SelectItem value="GBP">GBP - British Pound</SelectItem>
                          <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                          <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                          <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                          <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData({ ...formData, category: value })}
                        disabled={submitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="travel">Travel</SelectItem>
                          <SelectItem value="meals">Meals</SelectItem>
                          <SelectItem value="accommodation">Accommodation</SelectItem>
                          <SelectItem value="transportation">Transportation</SelectItem>
                          <SelectItem value="office-supplies">Office Supplies</SelectItem>
                          <SelectItem value="training">Training</SelectItem>
                          <SelectItem value="marketing">Marketing</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expenseDate">Date</Label>
                      <Input
                        id="expenseDate"
                        type="date"
                        value={formData.expenseDate}
                        onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                        required
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Brief description of the expense..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      disabled={submitting}
                      rows={3}
                    />
                  </div>

                  {receiptImage && (
                    <div className="space-y-2">
                      <Label>Receipt Preview</Label>
                      <div className="relative inline-block">
                        <Image
                          src={receiptImage}
                          alt="Receipt"
                          width={200}
                          height={150}
                          className="rounded border max-h-32 w-auto object-contain"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6"
                          onClick={clearReceipt}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        'Submit Expense'
                      )}
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {success && (
        <Alert className="bg-green-50 text-green-900 border-green-200">
          <CheckCircle className="w-4 h-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Expenses</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Approved</p>
              <p className="text-2xl font-bold">{stats.approved}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Approved</p>
              <p className="text-2xl font-bold">{company.currency} {stats.totalAmount.toFixed(2)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </Card>
      </div>

      {/* Expenses Table */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Expenses</h3>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No expenses yet. Click &quot;Submit Expense&quot; to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{new Date(expense.expenseDate).toLocaleDateString()}</TableCell>
                    <TableCell className="capitalize">{expense.category.replace(/-/g, ' ')}</TableCell>
                    <TableCell className="max-w-xs truncate">{expense.description || '-'}</TableCell>
                    <TableCell>
                      {expense.currency} {expense.amount.toFixed(2)}
                      {expense.currency !== company.currency && (
                        <span className="text-xs text-muted-foreground block">
                          ({company.currency} {expense.convertedAmount.toFixed(2)})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(expense.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>
    </div>
  );
}