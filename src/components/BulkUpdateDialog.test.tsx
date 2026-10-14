import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BulkUpdateDialog } from './BulkUpdateDialog';
import type { BulkExtension } from '@/api/bulkUpdate';

const mocks = vi.hoisted(() => ({
  isEdit: true,
  patch: vi.fn(),
  get: vi.fn(),
}));
vi.mock('@/auth/mode', () => ({ useMode: () => ({ isEdit: mocks.isEdit }) }));
vi.mock('./tour/TourProvider', () => ({ useTour: () => ({ start: vi.fn() }) }));
vi.mock('@/auth/useGraphToken', () => ({ useGraphToken: () => async () => 'token' }));
vi.mock('@/graph/client', () => ({
  createGraphClient: () => ({
    api: (path: string) => {
      const request = {
        select: () => request,
        top: () => request,
        header: () => request,
        count: () => request,
        filter: () => request,
        get: () => mocks.get(path),
        patch: (body: unknown) => mocks.patch(path, body),
      };
      return request;
    },
  }),
}));

const extension: BulkExtension = {
  variant: 'directory',
  ext: {
    id: 'ext',
    name: 'extension_app_flag',
    dataType: 'Boolean',
    targetObjects: ['User', 'Group'],
    isSyncedFromOnPremises: false,
  },
};

function renderDialog() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <BulkUpdateDialog extension={extension} onClose={vi.fn()} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
  mocks.isEdit = true;
  mocks.patch.mockReset().mockResolvedValue(undefined);
  mocks.get.mockReset().mockImplementation(async (path: string) => ({
    value:
      path === '/users'
        ? [
            { id: 'one', displayName: 'Alice' },
            { id: 'two', displayName: 'Bob' },
          ]
        : [{ id: 'group', displayName: 'Team' }],
  }));
});

describe('BulkUpdateDialog', () => {
  it('requires applying edited filters and limits an all-objects update to matching objects', async () => {
    mocks.get.mockResolvedValue({
      value: [
        {
          id: 'one',
          displayName: 'Alice',
          department: 'Engineering',
          onPremisesExtensionAttributes: { extensionAttribute1: 'West' },
        },
        {
          id: 'two',
          displayName: 'Bob',
          department: 'Sales',
          onPremisesExtensionAttributes: { extensionAttribute1: 'West' },
        },
      ],
    });
    renderDialog();
    await screen.findByRole('checkbox', { name: 'Select User Alice' });
    fireEvent.click(screen.getByRole('radio', { name: 'All available objects' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add filter' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Property 1' }), {
      target: { value: 'department' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Filter value 1' }), {
      target: { value: 'Engineering' },
    });
    expect(screen.getByRole('button', { name: 'Review update' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Add filter' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Property 2' }), {
      target: { value: 'extensionAttribute1' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Filter value 2' }), {
      target: { value: 'West' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
    await waitFor(() =>
      expect(screen.queryByRole('checkbox', { name: 'Select User Bob' })).not.toBeInTheDocument(),
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Value' }), { target: { value: 'true' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review update' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm update' }));
    await screen.findByText('1 updated · 0 failed');
    expect(mocks.patch).toHaveBeenCalledExactlyOnceWith('/users/one', { extension_app_flag: true });
  });

  it('keeps the object table bounded for large listings', async () => {
    mocks.get.mockResolvedValue({
      value: Array.from({ length: 120 }, (_, index) => ({
        id: `id-${index}`,
        displayName: `Person ${index}`,
      })),
    });
    renderDialog();
    await screen.findByRole('checkbox', { name: 'Select User Person 0' });
    expect(
      within(screen.getByRole('table', { name: 'Available objects' })).getAllByRole('row'),
    ).toHaveLength(51);
    fireEvent.click(screen.getByRole('button', { name: 'Next objects' }));
    expect(screen.getByRole('checkbox', { name: 'Select User Person 50' })).toBeInTheDocument();
    expect(
      screen.queryByRole('checkbox', { name: 'Select User Person 0' }),
    ).not.toBeInTheDocument();
  });

  it('retains a mixed-type selection across filters and requires confirmation', async () => {
    renderDialog();
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Select User Alice' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Filter objects' }), {
      target: { value: 'Team' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Group Team' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Value' }), { target: { value: 'true' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review update' }));
    const confirm = await screen.findByRole('button', { name: 'Confirm update' });
    expect(mocks.patch).not.toHaveBeenCalled();
    fireEvent.click(confirm);
    await screen.findByText('2 updated · 0 failed');
    expect(mocks.patch.mock.calls).toEqual([
      ['/users/one', { extension_app_flag: true }],
      ['/groups/group', { extension_app_flag: true }],
    ]);
  });

  it('updates all objects of the chosen types regardless of the filter', async () => {
    renderDialog();
    await screen.findByRole('checkbox', { name: 'Select User Alice' });
    fireEvent.click(screen.getByRole('radio', { name: 'All available objects' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Filter objects' }), {
      target: { value: 'Alice' },
    });
    expect(
      within(screen.getByRole('table', { name: 'Available objects' })).getAllByRole('row'),
    ).toHaveLength(2);
    fireEvent.change(screen.getByRole('textbox', { name: 'Value' }), {
      target: { value: 'false' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Review update' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm update' }));
    await screen.findByText('3 updated · 0 failed');
    expect(mocks.patch).toHaveBeenCalledTimes(3);
  });

  it('does not load objects or allow writes in read mode', () => {
    mocks.isEdit = false;
    renderDialog();
    expect(screen.getByRole('button', { name: 'Review update' })).toBeDisabled();
    expect(mocks.get).not.toHaveBeenCalled();
    expect(mocks.patch).not.toHaveBeenCalled();
  });

  it('shows partial failures and prevents closing until pending writes finish', async () => {
    let finish: (() => void) | undefined;
    mocks.patch
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            finish = resolve;
          }),
      )
      .mockRejectedValueOnce(new Error('Forbidden'));
    renderDialog();
    await screen.findByRole('checkbox', { name: 'Select User Alice' });
    fireEvent.click(screen.getByRole('radio', { name: 'All available objects' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Value' }), { target: { value: 'true' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review update' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm update' }));
    await waitFor(() => expect(mocks.patch).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();
    finish?.();
    await screen.findByText('2 updated · 1 failed');
    expect(screen.getByText('Forbidden')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Close' })).toBeEnabled();
  });
});
