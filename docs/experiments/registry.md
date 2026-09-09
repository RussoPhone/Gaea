# Registry de experimentos

Uma entrada executável reúne nome curto, fábrica de simulação sem argumentos e adapter de interface:

```python
Experiment("meu-estudo", "Meu estudo", create_simulation, serve_interface)
```

`serve_interface(simulation, host, port)` recebe a instância criada somente após a seleção. Para criar um grupo, omita as fábricas e informe folhas em `subexperiments`:

```python
Experiment("culinaria", "Culinária", subexperiments=(descoberta, transmissao))
```

Adicione a entrada ao `ExperimentRegistry` construído em `core/experiments/catalog.py`. Ela aparecerá no próximo `python -m core.main ui`.
