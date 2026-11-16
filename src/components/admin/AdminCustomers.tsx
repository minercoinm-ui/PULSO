import React, { useState } from 'react';
import { Search, Users } from 'lucide-react';
import { formatBRL, formatDateBR } from '../../lib/format';
import type { AdminCustomerSummary } from '../../types/ecommerce';

interface AdminCustomersProps {
  customers: AdminCustomerSummary[];
}

export function AdminCustomers({ customers }: AdminCustomersProps) {
  const [search, setSearch] = useState('');

  const filtered = customers.filter(
    (c) =>
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || '').includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-950">Clientes Cadastrados</h2>
          <p className="text-xs text-zinc-500">
            Consulte contas registradas, histórico de pedidos e volume total comprado na loja.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-900">
          <Users className="h-4 w-4 text-zinc-600" />
          <span className="font-mono tabular-nums">{customers.length}</span> contas
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, e-mail ou telefone..."
          className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-4 text-xs focus:border-zinc-950 focus:outline-none"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500">
            Nenhum cliente encontrado para a busca informada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-100 bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Nome</th>
                  <th className="px-5 py-3 font-medium">E-mail</th>
                  <th className="px-5 py-3 font-medium">Telefone</th>
                  <th className="px-5 py-3 font-medium">Perfil</th>
                  <th className="px-5 py-3 font-medium">Cadastro</th>
                  <th className="px-5 py-3 font-medium text-right">Pedidos</th>
                  <th className="px-5 py-3 font-medium text-right">Total Comprado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map((customer) => (
                  <tr key={customer.id} className="hover:bg-zinc-50/70">
                    <td className="px-5 py-3 font-semibold text-zinc-950">
                      {customer.full_name || 'Sem nome'}
                    </td>
                    <td className="px-5 py-3 text-zinc-700">{customer.email}</td>
                    <td className="px-5 py-3 font-mono text-zinc-600">
                      {customer.phone || '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                          customer.role === 'admin'
                            ? 'bg-zinc-950 text-lime-300'
                            : 'bg-zinc-100 text-zinc-700'
                        }`}
                      >
                        {customer.role === 'admin' ? 'Administrador' : 'Cliente'}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-zinc-500">
                      {formatDateBR(customer.created_at)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums font-medium">
                      {customer.orders_count}
                    </td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums font-semibold text-zinc-950">
                      {formatBRL(customer.total_spent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
