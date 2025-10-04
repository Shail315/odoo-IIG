"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, TrendingUp, FileText, Settings, PlusCircle, Loader2, CheckCircle, Edit, Trash2, DollarSign } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  companyId: number;
  managerId?: number | null;
  isManagerApprover: boolean;
}

interface Company {
  id: number;
  name: string;
  currency: string;
}

interface AdminDashboardProps {
  user: User;
  company: Company;
}

interface CompanyUser {
  id: number;
  name: string;
  email: string;
  role: string;
  managerId?: number | null;
  isManagerApprover: boolean;
}

interface Expense {
  id: number;
  employeeId: number;
  amount: number;
  currency: string;
  convertedAmount: number;
  category: string;
  description: string;
  status: string;
  expenseDate: string;
  createdAt: string;
}

export default function AdminDashboard({ user, company }: AdminDashboardProps) {
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee',
    managerId: '',
    isManagerApprover: false
  });

  useEffect(() => {
    fetchCompanyUsers();
    fetchAllExpenses();
  }, [company.id]);

  const fetchCompanyUsers = async () => {
    try {
      const response = await fetch(`/api/users/by-company/${company.id}`);
      const data = await response.json();
      setCompanyUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllExpenses = async () => {
    try {
      const response = await fetch(`/api/expenses?companyId=${company.id}`);
      const data = await response.json();
      setAllExpenses(data);
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUser.name,
          email: newUser.email,
          password: newUser.password,
          role: newUser.role,
          companyId: company.id,
          managerId: newUser.managerId ? parseInt(newUser.managerId) : null,
          isManagerApprover: newUser.isManagerApprover
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      setSuccess('User created successfully!');
      setUserDialogOpen(false);
      setNewUser({
        name: '',
        email: '',
        password: '',
        role: 'employee',
        managerId: '',
        isManagerApprover: false
      });
      fetchCompanyUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-purple-100 text-purple-700">Admin</Badge>;
      case 'manager':
        return <Badge className="bg-blue-100 text-blue-700">Manager</Badge>;
      case 'employee':
        return <Badge className="bg-green-100 text-green-700">Employee</Badge>;
      default:
        return <Badge>{role}</Badge>;
    }
  };

  const stats = {
    totalUsers: companyUsers.length,
    totalExpenses: allExpenses.length,
    pendingExpenses: allExpenses.filter(e => e.status === 'pending').length,
    approvedExpenses: allExpenses.filter(e => e.status === 'approved').length,
    totalAmount: allExpenses
      .filter(e => e.status === 'approved')
      .reduce((sum, e) => sum + e.convertedAmount, 0)
  };

  const managers = companyUsers.filter(u => u.role === 'manager' || u.role === 'admin');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Admin Dashboard</h2>
          <p className="text-muted-foreground">Manage users, expenses, and approval workflows</p>
        </div>
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
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Expenses</p>
              <p className="text-2xl font-bold">{stats.totalExpenses}</p>
            </div>
            <FileText className="w-8 h-8 text-purple-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold">{stats.pendingExpenses}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-yellow-500" />
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

      {/* Tabs for different sections */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="expenses">All Expenses</TabsTrigger>
        </TabsList>

        {/* User Management Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Company Users</h3>
                <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create New User</DialogTitle>
                      <DialogDescription>Add a new employee, manager, or admin to your company</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateUser} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          placeholder="John Doe"
                          value={newUser.name}
                          onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                          required
                          disabled={submitting}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@company.com"
                          value={newUser.email}
                          onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                          required
                          disabled={submitting}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="••••••••"
                          value={newUser.password}
                          onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                          required
                          disabled={submitting}
                          minLength={6}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Select
                          value={newUser.role}
                          onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                          disabled={submitting}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="employee">Employee</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {newUser.role === 'employee' && (
                        <div className="space-y-2">
                          <Label htmlFor="manager">Manager (Optional)</Label>
                          <Select
                            value={newUser.managerId}
                            onValueChange={(value) => setNewUser({ ...newUser, managerId: value })}
                            disabled={submitting}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select manager" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No Manager</SelectItem>
                              {managers.map((manager) => (
                                <SelectItem key={manager.id} value={manager.id.toString()}>
                                  {manager.name} ({manager.role})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {(newUser.role === 'manager' || newUser.role === 'admin') && (
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="isManagerApprover"
                            checked={newUser.isManagerApprover}
                            onCheckedChange={(checked) => setNewUser({ ...newUser, isManagerApprover: checked })}
                            disabled={submitting}
                          />
                          <Label htmlFor="isManagerApprover">Can approve expenses</Label>
                        </div>
                      )}

                      <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setUserDialogOpen(false)} disabled={submitting}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={submitting}>
                          {submitting ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            'Create User'
                          )}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Manager</TableHead>
                      <TableHead>Approver</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companyUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>{getRoleBadge(u.role)}</TableCell>
                        <TableCell>
                          {u.managerId ? 
                            companyUsers.find(m => m.id === u.managerId)?.name || '-'
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          {u.isManagerApprover ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* All Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">All Company Expenses</h3>
              
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : allExpenses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No expenses recorded yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allExpenses.slice(0, 20).map((expense) => {
                      const employee = companyUsers.find(u => u.id === expense.employeeId);
                      return (
                        <TableRow key={expense.id}>
                          <TableCell>{new Date(expense.expenseDate).toLocaleDateString()}</TableCell>
                          <TableCell>{employee?.name || 'Unknown'}</TableCell>
                          <TableCell className="capitalize">{expense.category.replace(/-/g, ' ')}</TableCell>
                          <TableCell>
                            {company.currency} {expense.convertedAmount.toFixed(2)}
                            {expense.currency !== company.currency && (
                              <span className="text-xs text-muted-foreground block">
                                ({expense.currency} {expense.amount.toFixed(2)})
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {expense.status === 'approved' && (
                              <Badge className="bg-green-100 text-green-700">Approved</Badge>
                            )}
                            {expense.status === 'rejected' && (
                              <Badge className="bg-red-100 text-red-700">Rejected</Badge>
                            )}
                            {expense.status === 'pending' && (
                              <Badge className="bg-yellow-100 text-yellow-700">Pending</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}