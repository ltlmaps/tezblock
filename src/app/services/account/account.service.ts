import { Injectable } from '@angular/core'
import { forkJoin, Observable } from 'rxjs'
import { map, switchMap } from 'rxjs/operators'

import { Account } from '../../interfaces/Account'
import { ApiService } from '../api/api.service'
import { Transaction } from 'src/app/interfaces/Transaction'

export interface GetDelegatedAccountsResponseDto {
  delegated: Account[]
  related: Account[]
}

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  constructor(private readonly apiService: ApiService) {}

  getDelegatedAccounts(
    address: string
  ): Observable<GetDelegatedAccountsResponseDto> {
    return this.apiService.getDelegatedAccounts(address, 10).pipe(
      switchMap((transactions: Transaction[]) => {
        if (transactions.length === 0) {
          // there exists the possibility that we're dealing with a kt address which might be delegated, but does not have delegated accounts itself
          return this.apiService.getAccountById(address).pipe(
            map((accounts: Account[]) => {
              const delegated = accounts.length > 0 && accounts[0].delegate_value ? [accounts[0]] : []

              return {
                delegated,
                related: []
              }
            })
          )
        }

        if (address.startsWith('tz')) {
          // since babylon, also tz addresses themselves can be delegated

          const originatedContracts = transactions.map(transaction => transaction.originated_contracts)

          return forkJoin(this.apiService.getAccountById(address), this.apiService.getAccountsByIds(originatedContracts)).pipe(
            map(([accounts, relatedAccounts]) => {
              const delegatedAccounts = accounts[0].delegate_value ? accounts : []

              return {
                delegated:
                  delegatedAccounts.length > 0
                    ? delegatedAccounts
                    : relatedAccounts.filter(relatedAccount => relatedAccount.delegate_value),
                related: relatedAccounts
              }
            })
          )
        }

        const managerPubKeys = transactions.map(transaction => transaction.manager_pubkey)

        return forkJoin(this.apiService.getAccountById(address), this.apiService.getAccountsByIds(managerPubKeys)).pipe(
          map(([accounts, relatedAccounts]) => {
            const delegated = accounts[0].delegate_value ? accounts : []

            return {
              delegated,
              related: relatedAccounts
            }
          })
        )
      })
    )
  }

  getAccountStatus(address: string): Promise<string> {
    return this.apiService.getAccountStatus(address)
  }
}
