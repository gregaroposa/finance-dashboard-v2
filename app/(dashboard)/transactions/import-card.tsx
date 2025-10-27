import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ImportTable } from "./import-table";
import { convertAmountToMiliunits, parseAmountFromString } from "@/lib/utils";
import { format, parse, isValid } from "date-fns";

const dateFormat = "yyyy-MM-dd HH:mm:ss";
const outputFormat = "yyyy-MM-dd";

const requiredOptions = ["amount", "date", "payee"];

interface SelectedColumnsState {
  [key: string]: string | null;
}

type Props = {
  data: string[][];
  onCancel: () => void;
  onSubmit: (data: any) => void;
};

export const ImportCard = ({ data, onCancel, onSubmit }: Props) => {
  const [selectedColumns, setSelectedColumns] = useState<SelectedColumnsState>(
    {}
  );

  const headers = data[0];
  const body = data.slice(1);

  const onTableHeadSelectChange = (
    columnIndex: number,
    value: string | null
  ) => {
    setSelectedColumns((prev) => {
      const newSelectedColumns = { ...prev };

      for (const key in newSelectedColumns) {
        if (newSelectedColumns[key] === value) {
          newSelectedColumns[key] = null;
        }
      }

      if (value === "skip") {
        value = null;
      }

      newSelectedColumns[`column_${columnIndex}`] = value;

      return newSelectedColumns;
    });
  };

  const progress = Object.values(selectedColumns).filter(Boolean).length;

  const handleContinue = () => {
    const inputDateFormats = [
      "yyyy-MM-dd HH:mm:ss",
      "yyyy-MM-dd",
      "yyyy-MM-dd'T'HH:mm:ss",
      "yyyy-MM-dd'T'HH:mm",
      "dd/MM/yyyy",
      "dd/MM/yyyy HH:mm:ss",
      "MM/dd/yyyy",
      "MM/dd/yyyy HH:mm:ss",
      "dd.MM.yyyy",
      "dd.MM.yyyy HH:mm:ss",
      "d.M.yyyy",
      "d.M.yyyy H:mm:ss",
      "yyyy/MM/dd",
      "yyyy/MM/dd HH:mm:ss",
    ];

    const parseToValidDate = (value: string) => {
      for (const fmt of inputDateFormats) {
        const d = parse(value, fmt, new Date());
        if (isValid(d)) return d;
      }
      const fallback = new Date(value);
      return isValid(fallback) ? fallback : null;
    };

    const getColumnIndex = (column: string) => {
      return column.split("_")[1];
    };

    const mappedData = {
      headers: headers.map((_header, index) => {
        const columnIndex = getColumnIndex(`column_${index}`);
        return selectedColumns[`column_${columnIndex}`] || null;
      }),
      body: body
        .map((row) => {
          const transformedRow = row.map((cell, index) => {
            const columnIndex = getColumnIndex(`column_${index}`);
            return selectedColumns[`column_${columnIndex}`] ? cell : null;
          });

          return transformedRow.every((item) => item === null)
            ? []
            : transformedRow;
        })
        .filter((row) => row.length > 0),
    };

    const arrayOfData = mappedData.body.map((row) => {
      return row.reduce((acc: any, cell, index) => {
        const header = mappedData.headers[index];
        if (header !== null) {
          acc[header] = cell;
        }

        return acc;
      }, {});
    });

    const formattedData = arrayOfData.map((item) => {
      const parsedAmount = parseAmountFromString(String(item.amount ?? ""));
      const parsedDate = parseToValidDate(String(item.date ?? ""));

      return {
        ...item,
        amount: convertAmountToMiliunits(parsedAmount),
        date: parsedDate ? format(parsedDate, outputFormat) : String(item.date ?? ""),
      };
    });

    onSubmit(formattedData);
  };

  return (
    <div className="max-w-screen-2xl mx-auto w-full pb-10 -mt-24">
      <Card borderless shadowless className="drop-shadow-sm">
        <CardHeader className="lg:grid-cols-[1fr_auto] lg:items-center lg:gap-y-0">
          <CardTitle className="text-xl line-clamp-1">
            Import Transaction
          </CardTitle>
          <div className="flex flex-col lg:flex-row gap-y-2 items-center gap-x-2">
            <Button
              onClick={onCancel}
              size="sm"
              className="w-full lg:w-auto lg:justify-self-end lg:col-start-2 lg:row-span-2 lg:row-start-1"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={progress < requiredOptions.length}
              onClick={handleContinue}
              className="w-full lg:w-auto lg:justify-self-end lg:col-start-2 lg:row-span-2 lg:row-start-1"
            >
              Continue ({progress} / {requiredOptions.length})
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ImportTable
            headers={headers}
            body={body}
            selectedColumns={selectedColumns}
            onTableHeadSelectChange={onTableHeadSelectChange}
          />
        </CardContent>
      </Card>
    </div>
  );
};
