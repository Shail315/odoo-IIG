"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Receipt, TrendingUp, Users, Shield, CheckCircle, ArrowRight } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="border-b bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Receipt className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold">ExpenseFlow</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            Expense Management
            <span className="block text-primary mt-2">Simplified</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Streamline your expense reimbursement process with automated workflows, 
            multi-level approvals, and intelligent OCR receipt scanning.
          </p>
          <div className="flex items-center justify-center gap-4 pt-4">
            <Link href="/signup">
              <Button size="lg" className="text-lg">
                Start Free Trial <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="text-lg">
                View Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need</h2>
          <p className="text-xl text-muted-foreground">Powerful features for modern expense management</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold">Smart Workflows</h3>
            <p className="text-muted-foreground">
              Define custom approval flows based on thresholds, roles, and business rules.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-semibold">Multi-Level Approvals</h3>
            <p className="text-muted-foreground">
              Support complex approval chains with sequential and conditional rules.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
              <Receipt className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold">OCR Receipt Scanning</h3>
            <p className="text-muted-foreground">
              Automatically extract expense details from receipts using AI technology.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
              <Users className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-xl font-semibold">Role-Based Access</h3>
            <p className="text-muted-foreground">
              Manage users with Admin, Manager, and Employee roles with proper permissions.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
              <Shield className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-xl font-semibold">Multi-Currency Support</h3>
            <p className="text-muted-foreground">
              Handle expenses in different currencies with automatic conversion.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-xl font-semibold">Real-Time Tracking</h3>
            <p className="text-muted-foreground">
              Monitor expense status and approval progress in real-time dashboards.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="bg-primary text-primary-foreground rounded-2xl p-12 text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold">Ready to Get Started?</h2>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            Join thousands of companies managing their expenses efficiently with ExpenseFlow
          </p>
          <Link href="/signup">
            <Button size="lg" variant="secondary" className="text-lg">
              Create Free Account <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 mt-20">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2024 ExpenseFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}