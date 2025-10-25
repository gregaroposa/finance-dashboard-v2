"use client";

import { useNewAccount } from "@/features/accounts/hooks/use-new-account";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";

const AccountsPage = () => {
  const newAccount = useNewAccount();

  return (
    <div className="max-w-screen-2xl mx-auto w-full pb-10 -mt-24">
      <Card borderless shadowless className="drop-shadow-sm">
        <CardHeader className="lg:grid-cols-[1fr_auto] lg:items-center lg:gap-y-0">
          <CardTitle className="text-xl line-clamp-1">Accounts Page</CardTitle>
          <Button
            onClick={newAccount.onOpen}
            size="sm"
            className="w-full lg:w-auto lg:justify-self-end lg:col-start-2 lg:row-span-2 lg:row-start-1"
          >
            <Plus className="size-4" />
            Add new
          </Button>
        </CardHeader>
      </Card>
    </div>
  );
};

export default AccountsPage;
