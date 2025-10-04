"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Clock, Loader2, Eye, ThumbsUp, ThumbsDown, DollarSign, FileText } from 'lucide-react';
import { Label } from '@/components/ui/label';

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

interface ManagerDashboardProps {
  user: User;
  company: Company;
}

interface PendingApproval {
  approvalId: number;
  expenseId: number;
  stepOrder: number;
  status: string;
  expense: {
    id: number;
    employeeId: number;
    amount: number;
    currency: string;
    convertedAmount: number;
    category: string;
    description: string;
    expenseDate: string;
    status: string;
    receiptUrl?: string;
    createdAt: string;
  };
}

export default function ManagerDashboard({ user, company }: ManagerDashboardProps) {
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [comments, setComments] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchPendingApprovals();
  }, [user.id]);

  const fetchPendingApprovals = async () => {
    try {
      const response = await fetch(`/api/expenses/pending-approvals/${user.id}`);
      const data = await response.json();
      setPendingApprovals(data);
    } catch (err) {
      console.error('Failed to fetch pending approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalAction = async () => {
    if (!selectedApproval || !action) return;

    setProcessing(true);
    setError('');
    setSuccess('');

    try {
      // Update the expense approval
      const approvalResponse = await fetch(`/api/expense-approvals?id=${selectedApproval.approvalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: action === 'approve' ? 'approved' : 'rejected',
          comments: comments || null
        })
      });

      if (!approvalResponse.ok) {
        throw new Error('Failed to update approval');
      }

      // Update the expense status if rejected or final approval
      if (action === 'reject') {
        await fetch(`/api/expenses?id=${selectedApproval.expenseId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'rejected'
          })
        });
      } else {
        // Check if this is the last approval step
        // For now, we'll mark as approved (in a real app, check if more approvers exist)
        await fetch(`/api/expenses?id=${selectedApproval.expenseId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'approved'
          })
        });
      }

      setSuccess(`Expense ${action === 'approve' ? 'approved' : 'rejected'} successfully!`);
      setDialogOpen(false);
      setSelectedApproval(null);
      setComments('');
      setAction(null);
      fetchPendingApprovals();
    } catch (err: any) {
      setError(err.message || 'Failed to process approval');
    } finally {
      setProcessing(false);
    }
  };

  const openApprovalDialog = (approval: PendingApproval, actionType: 'approve' | 'reject') => {
    setSelectedApproval(approval);
    setAction(actionType);
    setDialogOpen(true);
  };

  const stats = {
    pending: pendingApprovals.length,
    totalAmount: pendingApprovals.reduce((sum, a) => sum + a.expense.convertedAmount, 0)
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Pending Approvals</h2>
        <p className="text-muted-foreground">Review and approve expense claims from your team</p>
      </div>

      {success && (
        <Alert className="bg-green-50 text-green-900 border-green-200">
          <CheckCircle className="w-4 h-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Approvals</p>
              <p className="text-2xl font-bold">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold">{company.currency} {stats.totalAmount.toFixed(2)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-500" />
          </div>
        </Card>
      </div>

      {/* Pending Approvals Table */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Expenses Awaiting Your Approval</h3>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : pendingApprovals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No pending approvals. All caught up!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Step</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingApprovals.map((approval) => (
                  <TableRow key={approval.approvalId}>
                    <TableCell>{new Date(approval.expense.expenseDate).toLocaleDateString()}</TableCell>
                    <TableCell className="capitalize">{approval.expense.category.replace(/-/g, ' ')}</TableCell>
                    <TableCell className="max-w-xs truncate">{approval.expense.description || '-'}</TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{company.currency} {approval.expense.convertedAmount.toFixed(2)}</span>
                        {approval.expense.currency !== company.currency && (
                          <span className="text-xs text-muted-foreground block">
                            ({approval.expense.currency} {approval.expense.amount.toFixed(2)})
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">Step {approval.stepOrder}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openApprovalDialog(approval, 'approve')}
                        >
                          <ThumbsUp className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openApprovalDialog(approval, 'reject')}
                        >
                          <ThumbsDown className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === 'approve' ? 'Approve Expense' : 'Reject Expense'}
            </DialogTitle>
            <DialogDescription>
              {action === 'approve' 
                ? 'Are you sure you want to approve this expense?'
                : 'Please provide a reason for rejecting this expense.'}
            </DialogDescription>
          </DialogHeader>

          {selectedApproval && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Category:</span>
                  <span className="font-medium capitalize">{selectedApproval.expense.category.replace(/-/g, ' ')}</span>
                  
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-medium">{company.currency} {selectedApproval.expense.convertedAmount.toFixed(2)}</span>
                  
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-medium">{new Date(selectedApproval.expense.expenseDate).toLocaleDateString()}</span>
                </div>
                {selectedApproval.expense.description && (
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-sm text-muted-foreground">Description:</p>
                    <p className="text-sm">{selectedApproval.expense.description}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="comments">Comments {action === 'reject' && <span className="text-red-500">*</span>}</Label>
                <Textarea
                  id="comments"
                  placeholder={action === 'approve' ? 'Optional comments...' : 'Reason for rejection...'}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={3}
                  disabled={processing}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    setSelectedApproval(null);
                    setComments('');
                    setAction(null);
                  }}
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleApprovalAction}
                  disabled={processing || (action === 'reject' && !comments.trim())}
                  variant={action === 'approve' ? 'default' : 'destructive'}
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    action === 'approve' ? 'Approve' : 'Reject'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}